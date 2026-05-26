using System.Text.Json;
using System.Text;
using Google.Apis.Auth.OAuth2;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class GoogleFormsService : IGoogleFormsService
{
    private readonly IConfiguration _config;
    private readonly ILogger<GoogleFormsService> _logger;
    private readonly IHostEnvironment _env;

    public GoogleFormsService(IConfiguration config, ILogger<GoogleFormsService> logger, IHostEnvironment env)
    {
        _config = config;
        _logger = logger;
        _env = env;
    }

    public async Task<(string FormId, string FormEditUrl, string DriveWebViewLink)> CreateFormAsync(string title, List<GeneratedQuizQuestion> questions, string? teacherEmail, string? googleAccessToken = null)
    {
        var serviceAccountPath = _config["Google:ServiceAccountJsonPath"] ?? _config["QuizGeneration:GoogleForms:ServiceAccountJsonPath"];
        if (string.IsNullOrWhiteSpace(serviceAccountPath))
            throw new GoogleFormsConfigurationException("Google ServiceAccount JSON path is not configured. Set 'QuizGeneration:GoogleForms:ServiceAccountJsonPath' in configuration.");

        if (!TryResolveServiceAccountPath(serviceAccountPath, out var resolvedServiceAccountPath))
            throw new GoogleFormsConfigurationException($"Google ServiceAccount JSON not found at resolved path: {serviceAccountPath}");

        serviceAccountPath = resolvedServiceAccountPath;

        GoogleCredential credential;
        try
        {
            var inlineJson = _config["QuizGeneration:GoogleForms:ServiceAccountJson"] ?? _config["Google:ServiceAccountJson"];

            Stream? jsonStream = null;
            if (!string.IsNullOrWhiteSpace(serviceAccountPath) && File.Exists(serviceAccountPath))
            {
                jsonStream = File.OpenRead(serviceAccountPath);
                _logger.LogInformation("Using Google service account JSON file at {Path}", serviceAccountPath);
            }
            else if (!string.IsNullOrWhiteSpace(inlineJson))
            {
                jsonStream = new MemoryStream(Encoding.UTF8.GetBytes(inlineJson));
                _logger.LogInformation("Using Google service account JSON provided inline in configuration.");
            }
            else
            {
                throw new GoogleFormsConfigurationException($"Google ServiceAccount JSON not found at resolved path: {serviceAccountPath} and no inline JSON configured.");
            }

            await using (jsonStream)
            {
                credential = GoogleCredential.FromStream(jsonStream).CreateScoped(new[]
                {
                    "https://www.googleapis.com/auth/forms.body",
                    "https://www.googleapis.com/auth/drive"
                });
            }
        }
        catch (GoogleFormsConfigurationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load Google service account JSON");
            throw new GoogleFormsConfigurationException("Failed to load or parse the Google Service Account JSON. Ensure the file or inline JSON is valid and readable.");
        }

        var accessToken = await credential.UnderlyingCredential.GetAccessTokenForRequestAsync();

        using var http = new HttpClient();
        http.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        // Create the form with only the title. The Forms API requires using batchUpdate to add items.
        var createPayload = new Dictionary<string, object>
        {
            ["info"] = new Dictionary<string, object>
            {
                ["title"] = title
            }
        };

        var createJson = JsonSerializer.Serialize(createPayload);
        var createResp = await http.PostAsync("https://forms.googleapis.com/v1/forms", new StringContent(createJson, Encoding.UTF8, "application/json"));
        if (!createResp.IsSuccessStatusCode)
        {
            var body = await createResp.Content.ReadAsStringAsync();
            _logger.LogError("Create form failed: {Status} {Body} Payload:{Payload}", createResp.StatusCode, body, createJson);
            throw new GoogleFormsException($"Failed to create Google Form. Status:{createResp.StatusCode} Body:{body}");
        }

        var createBody = await createResp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(createBody);
        var name = doc.RootElement.GetProperty("name").GetString(); // like "forms/FORM_ID"
        var formId = name?.Split('/').Last() ?? throw new InvalidOperationException("Form id missing in response");

        // Now prepare batchUpdate requests to add each question as an item.
        var requests = new List<Dictionary<string, object>>();
        for (int i = 0; i < questions.Count; i++)
        {
            var q = questions[i];
            var optionsArr = q.Options.Select(o => new Dictionary<string, object> { ["value"] = o.Text }).ToArray();

            var item = new Dictionary<string, object>
            {
                ["title"] = q.Question,
                ["questionItem"] = new Dictionary<string, object>
                {
                    ["question"] = new Dictionary<string, object>
                    {
                        ["required"] = false,
                        ["choiceQuestion"] = new Dictionary<string, object>
                        {
                            ["type"] = "RADIO",
                            ["options"] = optionsArr
                        }
                    }
                }
            };

            var createItemReq = new Dictionary<string, object>
            {
                ["createItem"] = new Dictionary<string, object>
                {
                    ["item"] = item,
                    ["location"] = new Dictionary<string, object> { ["index"] = i }
                }
            };

            requests.Add(createItemReq);
        }

        var batchPayload = new Dictionary<string, object> { ["requests"] = requests.ToArray() };
        var batchJson = JsonSerializer.Serialize(batchPayload);
        var batchResp = await http.PostAsync($"https://forms.googleapis.com/v1/forms/{formId}:batchUpdate", new StringContent(batchJson, Encoding.UTF8, "application/json"));
        if (!batchResp.IsSuccessStatusCode)
        {
            var body = await batchResp.Content.ReadAsStringAsync();
            _logger.LogError("Batch update (add items) failed: {Status} {Body}", batchResp.StatusCode, body);
            throw new GoogleFormsException($"Failed to add items to Google Form. Status:{batchResp.StatusCode} Body:{body}");
        }

        // Share via Drive API
        if (!string.IsNullOrWhiteSpace(teacherEmail))
        {
            var permission = new { role = "writer", type = "user", emailAddress = teacherEmail.Trim() };
            var permJson = JsonSerializer.Serialize(permission);
            var permResp = await http.PostAsync($"https://www.googleapis.com/drive/v3/files/{formId}/permissions?sendNotificationEmail=true", new StringContent(permJson, Encoding.UTF8, "application/json"));
            if (!permResp.IsSuccessStatusCode)
            {
                var body = await permResp.Content.ReadAsStringAsync();
                _logger.LogWarning("Grant permission failed: {Status} {Body}", permResp.StatusCode, body);
                // continue even if sharing fails — caller will see warning in logs
            }
        }

        // Get drive file metadata to build webViewLink
        var metaResp = await http.GetAsync($"https://www.googleapis.com/drive/v3/files/{formId}?fields=webViewLink,webContentLink");
        string driveWebView = string.Empty;
        if (metaResp.IsSuccessStatusCode)
        {
            var meta = await metaResp.Content.ReadAsStringAsync();
            using var md = JsonDocument.Parse(meta);
            if (md.RootElement.TryGetProperty("webViewLink", out var wv)) driveWebView = wv.GetString() ?? string.Empty;
        }

        var editUrl = $"https://docs.google.com/forms/d/{formId}/edit";

        return (formId, editUrl, driveWebView);
    }

    private bool TryResolveServiceAccountPath(string configuredPath, out string resolvedPath)
    {
        var candidates = new List<string>();

        if (Path.IsPathRooted(configuredPath))
        {
            candidates.Add(configuredPath);
        }
        else
        {
            candidates.Add(Path.GetFullPath(Path.Combine(_env.ContentRootPath, configuredPath)));
        }

        candidates.Add(Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", "secret", "google-service-account.json")));

        foreach (var candidate in candidates.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (File.Exists(candidate))
            {
                resolvedPath = candidate;
                _logger.LogInformation("Resolved Google service account path to {Path}", candidate);
                return true;
            }
        }

        resolvedPath = configuredPath;
        return false;
    }
}
