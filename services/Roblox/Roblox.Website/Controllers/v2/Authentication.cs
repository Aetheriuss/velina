using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Roblox.Exceptions;
using Roblox.Models.Sessions;
using Roblox.Models.Users;
using Roblox.Services;
using Roblox.Services.App.FeatureFlags;
using Roblox.Services.Exceptions;
using Roblox.Website.WebsiteModels;
using Roblox.Website.WebsiteModels.Authentication;
using BadRequestException = Roblox.Exceptions.BadRequestException;
using ServiceProvider = Microsoft.Extensions.DependencyInjection.ServiceProvider;

namespace Roblox.Website.Controllers;

[ApiController]
[Route("/apisite/auth/v2")]
public class AuthenticationControllerV2 : ControllerBase
{
    [HttpGet("metadata")]
    public dynamic GetMetadata()
    {
        return new
        {
            cookieLawNoticeTimeout = 20 * 1000,
        };
    }

    [HttpGet("passwords/current-status")]
    public dynamic GetPasswordStatus()
    {
        return new
        {
            valid = true,
        };
    }

    [HttpPost("user/passwords/change")]
    public async Task ChangePassword([Required, FromBody] ChangePasswordRequest request)
    {
        FeatureFlags.FeatureCheck(FeatureFlag.ChangePasswordEnabled);
        var passwordOk = services.users.IsPasswordValid(request.newPassword);
        if (!passwordOk)
        {
            throw new BadRequestException(0, "Invalid password");
        }
        // Pass cooldown check
        if (!await services.cooldown.TryCooldownCheck("change password " + safeUserSession.userId,
                TimeSpan.FromMinutes(1)))
            throw new RobloxException(429, 0, "TooManyRequests");
        // Lock out repeated wrong-current-password attempts (security finding H2 / P0-8):
        // 5 failures per 15 minutes for this account.
        var changePwFailKey = "ChangePasswordFailV1:" + safeUserSession.userId;
        var changePwFails = (await services.cooldown.GetBucketDataForKey(changePwFailKey, TimeSpan.FromMinutes(15))).ToArray();
        if (changePwFails.Length >= 5)
            throw new RobloxException(429, 0, "TooManyRequests");
        // Verify password
        var correctPass = await services.users.VerifyPassword(safeUserSession.userId, request.currentPassword);
        if (!correctPass)
        {
            await services.cooldown.TryIncrementBucketCooldown(changePwFailKey, 5, TimeSpan.FromMinutes(15), changePwFails, true);
            throw new BadRequestException(8, "Password does not match");
        }
        // We can update the user's password now
        await services.users.UpdatePassword(safeUserSession.userId, request.newPassword);
    }

    [HttpPost("logout")]
    public async Task Logout()
    {
        await services.users.DeleteSession(safeUserSession.sessionId);
        using var sessCache = Roblox.Services.ServiceProvider.GetOrCreate<UserSessionsCache>();
        sessCache.Remove(safeUserSession.sessionId);
        HttpContext.Response.Cookies.Delete(Middleware.SessionMiddleware.CookieName);
    }

    private async Task CreateSessionAndSetCookie(long userId)
    {
        var sess = await services.users.CreateSession(userId);
        var sessionCookie = Roblox.Website.Middleware.SessionMiddleware.CreateJwt(new Middleware.JwtEntry()
        {
            sessionId = sess,
            createdAt = DateTimeOffset.Now.ToUnixTimeSeconds(),
        });
        // HttpOnly + Secure via the shared helper (security finding H10).
        Roblox.Website.Lib.SessionCookie.Append(HttpContext.Response, sessionCookie);
    }

    [HttpPost("login")]
    public async Task Login([Required, FromBody] LoginRequest request)
    {
        FeatureFlags.FeatureCheck(FeatureFlag.LoginEnabled);
        if (request.ctype != "username")
        {
            throw new BadRequestException(0, "Login type is not supported.");
        }

        // Brute-force throttling (security finding H2 / P0-8). This shares the same Redis
        // buckets as the Razor login page so both surfaces are limited together. Relies on a
        // trustworthy client IP, which is why P0-7 (cf-connecting-ip) must land first.
        var hashedIp = GetIP();
        // 1) Minimum spacing between attempts from one IP.
        if (!await services.cooldown.TryCooldownCheck("LoginAttemptV1:" + hashedIp, TimeSpan.FromSeconds(5)))
            throw new RobloxException(429, 0, "TooManyRequests");
        // 2) Max 15 attempts per IP per 10 minutes (count even rejected ones).
        var ipLoginKey = "LoginAttemptCountV1:" + hashedIp;
        var ipAttempts = (await services.cooldown.GetBucketDataForKey(ipLoginKey, TimeSpan.FromMinutes(10))).ToArray();
        if (!await services.cooldown.TryIncrementBucketCooldown(ipLoginKey, 15, TimeSpan.FromMinutes(10), ipAttempts, true))
            throw new RobloxException(429, 0, "TooManyRequests");

        long userId;
        try
        {
            userId = await services.users.GetUserIdFromUsername(request.cvalue);
        }
        catch (RecordNotFoundException e)
        {
            throw new ForbiddenException(1, "Incorrect username or password. Please try again");
        }

        // 3) Per-account lockout: 10 failed attempts per 15 minutes, independent of source IP.
        var accountKey = "LoginAttemptAccountV1:" + userId;
        var accountAttempts = (await services.cooldown.GetBucketDataForKey(accountKey, TimeSpan.FromMinutes(15))).ToArray();
        if (accountAttempts.Length >= 10)
            throw new RobloxException(429, 0, "TooManyRequests");

        var passwordOk = await services.users.VerifyPassword(userId, request.password);
        if (!passwordOk)
        {
            await services.cooldown.TryIncrementBucketCooldown(accountKey, 10, TimeSpan.FromMinutes(15), accountAttempts, true);
            throw new ForbiddenException(1, "Incorrect username or password. Please try again");
        }

        await CreateSessionAndSetCookie(userId);
    }

    [HttpPost("signup")]
    public async Task<SignupResponse> Signup([Required] SignUpRequest request)
    {
        throw new RobloxException(503, 0, "Service temporarily unavailable");
        FeatureFlags.FeatureCheck(FeatureFlag.SignupEnabled);
        var usernameValid = await services.users.IsUsernameValid(request.username);
        if (!usernameValid)
            throw new BadRequestException(5, "Invalid Username");

        var nameAvailable = await services.users.IsNameAvailableForSignup(request.username);
        if (!nameAvailable)
            throw new ForbiddenException(6, "Username is already taken");

        var passwordValid = services.users.IsPasswordValid(request.password);
        if (!passwordValid)
            throw new ForbiddenException(9, "Password is too simple");
        
        // Initial cooldown check - to prevent people spamming attempts
        await services.cooldown.CooldownCheck($"signup:step1:" + GetIP(), TimeSpan.FromSeconds(5));
        // Now make the account
        var createdUser =
            await services.users.CreateUser(request.username, request.password, Enum.Parse<Gender>(request.gender));

        await CreateSessionAndSetCookie(createdUser.userId);
        
        return new SignupResponse()
        {
            userId = createdUser.userId,
        };
    }

    [HttpPost("logoutfromallsessionsandreauthenticate")]
    public async Task LogoutFromAllSessionsAndReAuthenticate()
    {
        // We don't actually re authenticate (for security).
        await services.users.ExpireAllSessions(safeUserSession.userId);
        // remove current session immediately
        using var sessCache = Roblox.Services.ServiceProvider.GetOrCreate<UserSessionsCache>();
        sessCache.Remove(safeUserSession.sessionId);
    }
}