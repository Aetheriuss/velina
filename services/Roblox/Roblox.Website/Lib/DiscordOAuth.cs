using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Roblox.Libraries.EasyJwt;

namespace Roblox.Website.Lib;

public class DiscordUserInfo
{
    public string id { get; set; } = "";
    public string username { get; set; } = "";
}

// Carried (signed) between the OAuth callback and the choose-username page for a brand-new account.
public class DiscordPendingSignup
{
    public string discordId { get; set; } = "";
    public string suggestedUsername { get; set; } = "";
    public long iat { get; set; }
}

/// <summary>
/// Discord OAuth2 (scope "identify") — the only public registration/login path. Builds the authorize
/// URL, exchanges the code for the user's Discord id + username, and signs a short-lived "pending signup"
/// token so the discord id can't be forged on the choose-username step.
/// </summary>
public static class DiscordOAuth
{
    private static readonly HttpClient http = new();
    private static readonly EasyJwt jwt = new();
    private static readonly JsonSerializerOptions json = new() { PropertyNameCaseInsensitive = true };
    private const string Scope = "identify";
    private const long PendingTtlSeconds = 600; // 10 minutes to pick a username

    public static bool IsConfigured =>
        !string.IsNullOrWhiteSpace(Roblox.Configuration.DiscordClientId) &&
        !string.IsNullOrWhiteSpace(Roblox.Configuration.DiscordClientSecret) &&
        !string.IsNullOrWhiteSpace(Roblox.Configuration.DiscordRedirectUri);

    public static string BuildAuthorizeUrl(string state)
    {
        var clientId = Uri.EscapeDataString(Roblox.Configuration.DiscordClientId);
        var redirect = Uri.EscapeDataString(Roblox.Configuration.DiscordRedirectUri);
        return "https://discord.com/api/oauth2/authorize"
               + "?response_type=code"
               + "&client_id=" + clientId
               + "&scope=" + Uri.EscapeDataString(Scope)
               + "&redirect_uri=" + redirect
               + "&state=" + Uri.EscapeDataString(state)
               + "&prompt=none";
    }

    /// <summary>Exchange the OAuth code for an access token, then fetch the Discord user. Null on any failure.</summary>
    public static async Task<DiscordUserInfo?> ExchangeCodeForUserAsync(string code)
    {
        var form = new Dictionary<string, string>
        {
            ["client_id"] = Roblox.Configuration.DiscordClientId,
            ["client_secret"] = Roblox.Configuration.DiscordClientSecret,
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = Roblox.Configuration.DiscordRedirectUri,
        };
        using var tokenResp = await http.PostAsync("https://discord.com/api/oauth2/token", new FormUrlEncodedContent(form));
        if (!tokenResp.IsSuccessStatusCode) return null;
        var tokenJson = await tokenResp.Content.ReadAsStringAsync();
        string? accessToken;
        try { accessToken = JsonSerializer.Deserialize<TokenResponse>(tokenJson, json)?.access_token; }
        catch { return null; }
        if (string.IsNullOrEmpty(accessToken)) return null;

        using var meReq = new HttpRequestMessage(HttpMethod.Get, "https://discord.com/api/users/@me");
        meReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        using var meResp = await http.SendAsync(meReq);
        if (!meResp.IsSuccessStatusCode) return null;
        var meJson = await meResp.Content.ReadAsStringAsync();
        try
        {
            var user = JsonSerializer.Deserialize<DiscordUserInfo>(meJson, json);
            if (user == null || string.IsNullOrEmpty(user.id)) return null;
            return user;
        }
        catch { return null; }
    }

    public static string SignPending(string discordId, string suggestedUsername)
    {
        return jwt.CreateJwt(new DiscordPendingSignup
        {
            discordId = discordId,
            suggestedUsername = suggestedUsername,
            iat = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
        }, Roblox.Configuration.VerificationSecret);
    }

    public static DiscordPendingSignup? ReadPending(string? token)
    {
        if (string.IsNullOrEmpty(token)) return null;
        try
        {
            var p = jwt.DecodeJwt<DiscordPendingSignup>(token, Roblox.Configuration.VerificationSecret);
            if (p == null || string.IsNullOrEmpty(p.discordId)) return null;
            if (p.iat < DateTimeOffset.UtcNow.ToUnixTimeSeconds() - PendingTtlSeconds) return null; // expired
            return p;
        }
        catch { return null; }
    }

    private class TokenResponse
    {
        [JsonPropertyName("access_token")] public string? access_token { get; set; }
    }
}
