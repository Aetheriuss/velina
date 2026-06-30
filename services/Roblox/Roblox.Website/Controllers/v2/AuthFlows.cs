using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Roblox.Dto.Avatar;
using Roblox.Exceptions;
using Roblox.Exceptions.Services.Users;
using Roblox.Models.Avatar;
using Roblox.Models.Users;
using Roblox.Services.Exceptions;
using Roblox.Website.Lib;
using Roblox.Website.Pages.Auth;
using BadRequestException = Roblox.Exceptions.BadRequestException;

namespace Roblox.Website.Controllers;

public class DiscordChooseUsernameRequest
{
    public string? username { get; set; }
    public string? password { get; set; }
}

public class AccountDeletionApiRequest
{
    public string? username { get; set; }
    public string? password { get; set; }
}

/// <summary>
/// JSON equivalents of the interactive auth Razor pages, so the App Router can own the UI while the
/// security-sensitive work (session cookie, account creation/deletion) still happens server-side.
/// These are faithful ports of Pages/Auth/ChooseUsername.cshtml.cs and Pages/Auth/AccountDeletion.cshtml.cs.
///
/// CSRF: these POSTs are NOT in CsrfMiddleware.bypassUrls, so they go through the standard
/// rbxcsrf4 challenge-retry (the App Router apiClient retries once on 403 + x-csrf-token).
/// The Discord OAuth redirect flow (/auth/discord/login + /callback) stays on .NET unchanged.
/// </summary>
[ApiController]
[Route("/apisite/auth/v2")]
public class AuthFlowsController : ControllerBase
{
    // Identical to RobloxPageModel.CreateSessionAndSetCookie / AuthenticationControllerV2 — every login
    // path must set .ROBLOSECURITY the same way (HttpOnly + Secure via the shared SessionCookie helper).
    private async Task CreateSessionAndSetCookie(long userId)
    {
        var sess = await services.users.CreateSession(userId);
        var sessionCookie = Roblox.Website.Middleware.SessionMiddleware.CreateJwt(new Middleware.JwtEntry()
        {
            sessionId = sess,
            createdAt = DateTimeOffset.Now.ToUnixTimeSeconds(),
        });
        Roblox.Website.Lib.SessionCookie.Append(HttpContext.Response, sessionCookie);
    }

    private static DiscordPendingSignup? ReadPending(HttpRequest req)
        => DiscordOAuth.ReadPending(req.Cookies[DiscordLogin.PendingCookie]);

    /// <summary>
    /// The Discord signup info carried in the HttpOnly es_discord_pending cookie. The App Router
    /// choose-username page can't read that cookie itself, so it fetches the suggested name here.
    /// 401 → the pending token expired / there is no Discord signup in progress.
    /// </summary>
    [HttpGet("discord/pending")]
    public dynamic GetDiscordPending()
    {
        var pending = ReadPending(Request);
        if (pending == null)
            throw new RobloxException(401, 0, "No pending Discord signup. Please sign in with Discord again.");
        return new
        {
            suggestedUsername = pending.suggestedUsername,
        };
    }

    /// <summary>Faithful JSON port of ChooseUsername.OnPost — creates the Discord-linked account + session.</summary>
    [HttpPost("discord/choose-username")]
    public async Task<dynamic> DiscordChooseUsername([Required, FromBody] DiscordChooseUsernameRequest req)
    {
        var pending = ReadPending(Request);
        if (pending == null)
            throw new RobloxException(401, 0, "Your Discord signup session expired. Please sign in with Discord again.");

        // If this Discord id already got an account (double-submit / race), just log in.
        var alreadyLinked = await services.users.GetUserIdFromDiscordId(pending.discordId);
        if (alreadyLinked != 0)
        {
            Response.Cookies.Delete(DiscordLogin.PendingCookie);
            await CreateSessionAndSetCookie(alreadyLinked);
            return new { userId = alreadyLinked };
        }

        if (string.IsNullOrWhiteSpace(req.username) || !await services.users.IsUsernameValid(req.username))
            throw new BadRequestException(1,
                "Invalid username. It must start and end with an alpha-numeric character, be between 3 and 21 characters, and contain at most one special character (space, period, or underscore). Some words are not allowed.");
        if (!await services.users.IsNameAvailableForSignup(req.username))
            throw new BadRequestException(10, "That username is already taken. Please choose another.");

        // Password optional: a set password also enables username+password login; blank stores a random
        // unusable value so Discord stays the only way in.
        string accountPassword;
        if (!string.IsNullOrEmpty(req.password))
        {
            if (!services.users.IsPasswordValid(req.password))
                throw new BadRequestException(9,
                    "That password is too short. It must be at least 3 characters, or leave it blank to sign in with Discord only.");
            accountPassword = req.password;
        }
        else
        {
            accountPassword = Roblox.Libraries.CryptoRandom.TokenUrlSafe(48);
        }

        long createdUserId;
        try
        {
            var created = await services.users.CreateUser(req.username, accountPassword, Gender.Unknown, null, pending.discordId);
            createdUserId = created.userId;
        }
        catch (Exception e)
        {
            // Only report "taken" if the name actually became unavailable (a race on the unique check).
            if (!await services.users.IsNameAvailableForSignup(req.username))
                throw new BadRequestException(10, "That username is already taken. Please choose another.");
            Roblox.Logging.Writer.Info(Roblox.Logging.LogGroup.SignUp, "Discord signup CreateUser failed: {0}", e.Message);
            throw new RobloxException(500, 0, "Something went wrong creating your account. Please try again.");
        }

        Response.Cookies.Delete(DiscordLogin.PendingCookie);
        await CreateSessionAndSetCookie(createdUserId);
        return new { userId = createdUserId };
    }

    /// <summary>Faithful JSON port of AccountDeletion.OnPost — verify username+password, then delete.</summary>
    [HttpPost("account-deletion")]
    public async Task<dynamic> AccountDeletion([Required, FromBody] AccountDeletionApiRequest req)
    {
        // Per-IP rate limit (the Razor page used a daily-cleared dictionary; the Redis cooldown bucket
        // gives the same 10-attempts-per-day cap and survives restarts). Counts every attempt.
        var rlKey = "AccountDeletionV1:" + GetIP();
        var attempts = (await services.cooldown.GetBucketDataForKey(rlKey, TimeSpan.FromDays(1))).ToArray();
        if (!await services.cooldown.TryIncrementBucketCooldown(rlKey, 10, TimeSpan.FromDays(1), attempts, true))
            throw new RobloxException(429, 0, "You have been making too many attempts. Try again tomorrow.");

        if (string.IsNullOrEmpty(req.username))
            throw new BadRequestException(0, "Invalid username provided.");

        var users = (await services.users.MultiGetUsersByUsername(new[] { req.username })).ToArray();
        if (users.Length == 0)
            throw new BadRequestException(0, "The username provided is invalid or does not exist. Your account may already be deleted.");

        var loginOk = await services.users.VerifyPassword(users[0].id, req.password);
        if (!loginOk)
            throw new ForbiddenException(0, "The username and password combination provided is invalid. Please try again.");

        try
        {
            await services.users.DeleteUser(users[0].id, false);
        }
        catch (AccountLastOnlineTooRecentlyException)
        {
            throw new RobloxException(400, 0, "Your account was last online too recently. Please try again later.");
        }

        // Reset avatar to the default R6 appearance (same as the Razor page).
        services.avatar.RedrawAvatar(users[0].id, new List<long>(), new ColorEntry()
        {
            headColorId = 194,
            torsoColorId = 23,
            rightArmColorId = 194,
            leftArmColorId = 194,
            rightLegColorId = 102,
            leftLegColorId = 102,
        }, AvatarType.R6);

        return new { success = true };
    }
}
