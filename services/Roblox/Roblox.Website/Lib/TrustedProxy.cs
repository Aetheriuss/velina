using System.Net;
using Microsoft.AspNetCore.HttpOverrides;

namespace Roblox.Website.Lib;

/// <summary>
/// Holds the set of networks (CIDRs) that are allowed to act as a trusted reverse
/// proxy in front of the backend. In the production topology this is the internal
/// Docker network that the <c>cloudflared</c> tunnel container lives on.
///
/// It is used for two things:
///  - the <c>ForwardedHeaders</c> middleware's <c>KnownNetworks</c> (so X-Forwarded-* is honored only from the proxy), and
///  - deciding whether the spoofable <c>cf-connecting-ip</c> header may be trusted (security finding H3 / P0-7).
///
/// Configured once at startup from the <c>TrustedProxyNetworks</c> config array.
/// When nothing is configured the set is empty, which is fail-safe: no forwarded
/// headers are trusted and every request is attributed to its real socket peer.
/// </summary>
public static class TrustedProxy
{
    private static IReadOnlyList<IPNetwork> _networks = new List<IPNetwork>();

    public static IReadOnlyList<IPNetwork> Networks => _networks;

    public static void Configure(IEnumerable<string>? cidrs)
    {
        var list = new List<IPNetwork>();
        if (cidrs != null)
        {
            foreach (var entry in cidrs)
            {
                if (string.IsNullOrWhiteSpace(entry))
                    continue;
                var parsed = Parse(entry.Trim());
                if (parsed != null)
                    list.Add(parsed);
                else
                    Console.WriteLine("[TrustedProxy] Ignoring invalid CIDR in TrustedProxyNetworks: {0}", entry);
            }
        }

        _networks = list;
        Console.WriteLine("[TrustedProxy] Configured {0} trusted proxy network(s)", _networks.Count);
    }

    /// <summary>
    /// True when <paramref name="address"/> falls inside any configured trusted network.
    /// IPv4-mapped IPv6 addresses (e.g. "::ffff:172.30.0.5", which Kestrel may report
    /// for an IPv4 peer) are normalized so an IPv4 CIDR still matches.
    /// </summary>
    public static bool IsTrusted(IPAddress? address)
    {
        if (address == null)
            return false;
        if (address.IsIPv4MappedToIPv6)
            address = address.MapToIPv4();

        foreach (var net in _networks)
        {
            if (net.Contains(address))
                return true;
        }

        return false;
    }

    private static IPNetwork? Parse(string cidr)
    {
        var parts = cidr.Split('/');
        if (parts.Length != 2)
            return null;
        if (!IPAddress.TryParse(parts[0], out var ip))
            return null;
        if (!int.TryParse(parts[1], out var prefix))
            return null;
        try
        {
            return new IPNetwork(ip, prefix);
        }
        catch
        {
            return null;
        }
    }
}
