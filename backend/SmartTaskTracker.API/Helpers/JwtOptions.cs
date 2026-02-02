namespace SmartTaskTracker.API.Helpers;

public class JwtOptions
{
    public string Key { get; set; } = "";
    public string Issuer { get; set; } = "SmartTaskTracker";
    public string Audience { get; set; } = "SmartTaskTracker";
}
