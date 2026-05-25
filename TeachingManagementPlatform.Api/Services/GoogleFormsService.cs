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

    public GoogleFormsService(IConfiguration config, ILogger<GoogleFormsService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task<(string FormId, string FormEditUrl, string DriveWebViewLink)> CreateFormAsync(string title, List<GeneratedQuizQuestion> questions, string teacherEmail)
    {
        var serviceAccountPath = _config["Google:ServiceAccountJsonPath"] ?? _config["QuizGeneration:GoogleForms:ServiceAccountJsonPath"];
        if (string.IsNullOrWhiteSpace(serviceAccountPath) || !File.Exists(serviceAccountPath))
            throw new GoogleFormsConfigurationException("Google ServiceAccount JSON path is not configured or file not found. Set 'QuizGeneration:GoogleForms:ServiceAccountJsonPath' in configuration and ensure the file is accessible.");

        GoogleCredential credential;
        try
        {
            await using (var fs = File.OpenRead(serviceAccountPath))
            {
                credential = GoogleCredential.FromStream(fs).CreateScoped(new[]
                {
                    "https://www.googleapis.com/auth/forms.body",
                    "https://www.googleapis.com/auth/drive"
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load Google service account JSON from {Path}", serviceAccountPath);
            throw new GoogleFormsConfigurationException("Failed to load or parse the Google Service Account JSON. Ensure the file is valid and readable.");
        }

        var accessToken = await credential.UnderlyingCredential.GetAccessTokenForRequestAsync();

        using var http = new HttpClient();
        http.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        // Build form create payload
        var form = new Dictionary<string, object>
        {
            ["info"] = new Dictionary<string, object>
            {
                ["title"] = title
            },
            ["items"] = questions.Select(q => new Dictionary<string, object>
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
                            ["options"] = q.Options.Select(o => new Dictionary<string, object> { ["value"] = o.Text }).ToArray()
                        }
                    }
                }
            }).ToArray()
        };

        var json = JsonSerializer.Serialize(form);

        var createResp = await http.PostAsync("https://forms.googleapis.com/v1/forms", new StringContent(json, Encoding.UTF8, "application/json"));
        if (!createResp.IsSuccessStatusCode)
        {
            var body = await createResp.Content.ReadAsStringAsync();
            _logger.LogError("Create form failed: {Status} {Body}", createResp.StatusCode, body);
            throw new GoogleFormsException($"Failed to create Google Form. Status: {createResp.StatusCode}");
        }

        var createBody = await createResp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(createBody);
        var name = doc.RootElement.GetProperty("name").GetString(); // like "forms/FORM_ID"
        var formId = name?.Split('/').Last() ?? throw new InvalidOperationException("Form id missing in response");

        // Share via Drive API
        var permission = new { role = "writer", type = "user", emailAddress = teacherEmail };
        var permJson = JsonSerializer.Serialize(permission);
        var permResp = await http.PostAsync($"https://www.googleapis.com/drive/v3/files/{formId}/permissions?sendNotificationEmail=true", new StringContent(permJson, Encoding.UTF8, "application/json"));
        if (!permResp.IsSuccessStatusCode)
        {
            var body = await permResp.Content.ReadAsStringAsync();
            _logger.LogWarning("Grant permission failed: {Status} {Body}", permResp.StatusCode, body);
            // continue even if sharing fails — caller will see warning in logs
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
}
