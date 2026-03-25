using Npgsql;

namespace SmartTaskTracker.API.Helpers;

/// <summary>
/// Render (and Heroku-style) <c>DATABASE_URL</c> uses a URI; Npgsql expects keyword=value pairs.
/// </summary>
public static class PostgresConnectionString
{
    public static string FromDatabaseUrl(string databaseUrl)
    {
        if (string.IsNullOrWhiteSpace(databaseUrl))
            throw new ArgumentException("DATABASE_URL is empty.", nameof(databaseUrl));

        var trimmed = databaseUrl.Trim();
        if (!trimmed.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
            && !trimmed.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
            return trimmed;

        var uri = new Uri(trimmed);
        var userInfo = uri.UserInfo.Split(':', 2);
        var username = Uri.UnescapeDataString(userInfo[0]);
        var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;

        var host = uri.Host;
        var port = uri.IsDefaultPort ? 5432 : uri.Port;
        var database = uri.AbsolutePath.TrimStart('/').Split('?')[0];
        if (string.IsNullOrEmpty(database))
            throw new InvalidOperationException("DATABASE_URL must include a database name (path after host).");

        var csb = new NpgsqlConnectionStringBuilder
        {
            Host = host,
            Port = port,
            Database = database,
            Username = username,
            Password = password,
            SslMode = SslMode.Require
        };
        return csb.ConnectionString;
    }
}
