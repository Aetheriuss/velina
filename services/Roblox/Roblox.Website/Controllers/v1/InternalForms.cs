using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Roblox.Exceptions;
using Roblox.Models.AbuseReport;
using Roblox.Models.Users;
using BadRequestException = Roblox.Exceptions.BadRequestException;

namespace Roblox.Website.Controllers;

public class MembershipChangeRequest
{
    public string? membershipType { get; set; }
}

public class ReportAbuseApiRequest
{
    public string? reportReason { get; set; }
    public string? reportMessage { get; set; }
}

/// <summary>
/// JSON equivalents of the simple interactive /internal/* Razor forms, so the App Router can own the
/// UI while the mutations stay server-side. Faithful ports of Pages/Internal/{Membership,Age,ReportAbuse}.
/// (CreatePlace stays on .NET — its OnPost anti-abuse validation is intentionally not duplicated here.)
///
/// CSRF: these POSTs are NOT in CsrfMiddleware.bypassUrls, so they use the standard rbxcsrf4
/// challenge-retry that the App Router apiClient already handles.
/// </summary>
[ApiController]
[Route("/apisite/internal-forms/v1")]
public class InternalFormsController : ControllerBase
{
    [HttpGet("membership")]
    public async Task<dynamic> GetMembership()
    {
        var m = await services.users.GetUserMembership(safeUserSession.userId);
        return new { membershipType = (m?.membershipType ?? MembershipType.None).ToString() };
    }

    [HttpPost("membership")]
    public async Task SetMembership([Required, FromBody] MembershipChangeRequest req)
    {
        if (!Enum.TryParse<MembershipType>(req.membershipType, out var mt) || !Enum.IsDefined(mt))
            throw new BadRequestException(0, "Invalid membership type.");
        await services.users.InsertOrUpdateMembership(safeUserSession.userId, mt);
    }

    [HttpGet("age")]
    public async Task<dynamic> GetAge()
    {
        return new { is18Plus = await services.users.Is18Plus(safeUserSession.userId) };
    }

    [HttpPost("age")]
    public async Task MarkAge()
    {
        // Idempotent: safe to call when already certified.
        if (!await services.users.Is18Plus(safeUserSession.userId))
            await services.users.MarkAs18Plus(safeUserSession.userId);
    }

    [HttpPost("report-abuse")]
    public async Task ReportAbuse([Required, FromBody] ReportAbuseApiRequest req)
    {
        if (!Enum.TryParse<AbuseReportReason>(req.reportReason, out var reason) || !Enum.IsDefined(reason) || reason == AbuseReportReason.None)
            throw new BadRequestException(0, "Invalid report reason.");
        var msg = (req.reportMessage ?? "").Trim();
        if (msg.Length < 10)
            throw new BadRequestException(0, "Report message must be at least 10 characters. Please include as much detail as possible.");
        await services.abuseReport.InsertReport(safeUserSession.userId, reason, msg);
    }
}
