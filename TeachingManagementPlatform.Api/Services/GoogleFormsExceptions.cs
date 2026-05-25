namespace TeachingManagementPlatform.Api.Services;

public class GoogleFormsException : Exception
{
    public GoogleFormsException(string message) : base(message) { }
    public GoogleFormsException(string message, Exception inner) : base(message, inner) { }
}

public class GoogleFormsConfigurationException : GoogleFormsException
{
    public GoogleFormsConfigurationException(string message) : base(message) { }
}
