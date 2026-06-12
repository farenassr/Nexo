namespace Nexo.Server.Errors;

public static class NexoProblemDetailsTypes
{
    public const string BaseUri = "https://nexo.app/problems/";

    public static string FromCode(string code)
    {
        return BaseUri + ToKebabCase(code);
    }

    private static string ToKebabCase(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "unknown-error";
        }

        var builder = new System.Text.StringBuilder(value.Length + 8);
        for (var index = 0; index < value.Length; index++)
        {
            var character = value[index];
            if (char.IsWhiteSpace(character) || character is '_' or '-')
            {
                AppendSeparator(builder);
                continue;
            }

            if (char.IsUpper(character) && builder.Length > 0 && builder[^1] != '-')
            {
                AppendSeparator(builder);
            }

            builder.Append(char.ToLowerInvariant(character));
        }

        return builder.ToString().Trim('-');
    }

    private static void AppendSeparator(System.Text.StringBuilder builder)
    {
        if (builder.Length > 0 && builder[^1] != '-')
        {
            builder.Append('-');
        }
    }
}
