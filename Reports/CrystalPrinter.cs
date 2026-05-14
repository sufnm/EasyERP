using System;
using System.IO;
using System.Text;
using CrystalDecisions.CrystalReports.Engine;
using CrystalDecisions.Shared;

public static class ToArabicWords
{
    private static readonly string[] Ones = { "", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر" };
    private static readonly string[] Tens = { "", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون" };
    private static readonly string[] Hundreds = { "", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة" };

    public static string Convert(decimal number)
    {
        if (number == 0) return "صفر";

        long integerPart = (long)Math.Truncate(number);
        int decimalPart = (int)Math.Round((number - integerPart) * 100);

        string integerWords = ConvertGroup(integerPart);
        string decimalWords = decimalPart > 0 ? ConvertGroup(decimalPart) : "";

        string result = "";
        if (integerPart > 0)
        {
            result += integerWords + " ريال";
            if (integerPart >= 3 && integerPart <= 10) result += "ات";
            else if (integerPart > 10) result += "اً";
        }

        if (decimalPart > 0)
        {
            if (integerPart > 0) result += " و ";
            result += decimalWords + " هللة";
        }

        return "فقط " + result + " لا غير";
    }

    private static string ConvertGroup(long number)
    {
        if (number == 0) return "";
        if (number < 20) return Ones[number];
        if (number < 100)
        {
            long ones = number % 10;
            long tens = number / 10;
            return (ones > 0 ? Ones[ones] + " و " : "") + Tens[tens];
        }
        if (number < 1000)
        {
            long hundreds = number / 100;
            long remainder = number % 100;
            return Hundreds[hundreds] + (remainder > 0 ? " و " + ConvertGroup(remainder) : "");
        }
        if (number < 1000000)
        {
            long thousands = number / 1000;
            long remainder = number % 1000;
            string thWord = "ألف";
            if (thousands == 2) thWord = "ألفان";
            else if (thousands >= 3 && thousands <= 10) thWord = "آلاف";
            else if (thousands > 10) thWord = "ألفاً";

            string prefix = (thousands == 1 || thousands == 2) ? "" : ConvertGroup(thousands) + " ";
            return prefix + thWord + (remainder > 0 ? " و " + ConvertGroup(remainder) : "");
        }
        return number.ToString(); // fallback
    }
}

class CrystalPrinterApp
{
    static int Main(string[] args)
    {
        try
        {
            string reportPath = "";
            string server = "";
            string database = "";
            string username = "";
            string password = "";
            string brnCode = "1";
            string invoiceNo = "";
            int trnType = 6;
            decimal netAmount = 0;
            string pdfPath = "";

            for (int i = 0; i < args.Length; i++)
            {
                if (args[i] == "--report" && i + 1 < args.Length) reportPath = args[++i];
                else if (args[i] == "--server" && i + 1 < args.Length) server = args[++i];
                else if (args[i] == "--database" && i + 1 < args.Length) database = args[++i];
                else if (args[i] == "--user" && i + 1 < args.Length) username = args[++i];
                else if (args[i] == "--password" && i + 1 < args.Length) password = args[++i];
                else if (args[i] == "--brn" && i + 1 < args.Length) brnCode = args[++i];
                else if (args[i] == "--invoice" && i + 1 < args.Length) invoiceNo = args[++i];
                else if (args[i] == "--type" && i + 1 < args.Length) trnType = int.Parse(args[++i]);
                else if (args[i] == "--amount" && i + 1 < args.Length) netAmount = decimal.Parse(args[++i]);
                else if (args[i] == "--pdf" && i + 1 < args.Length) pdfPath = args[++i];
            }

            if (string.IsNullOrEmpty(reportPath) || !File.Exists(reportPath))
            {
                Console.WriteLine("Error: Report file not found at " + reportPath);
                return 1;
            }

            ReportDocument crRep = new ReportDocument();
            crRep.Load(reportPath);

            ConnectionInfo crConnectionInfo = new ConnectionInfo();
            crConnectionInfo.ServerName = server;
            crConnectionInfo.DatabaseName = database;
            crConnectionInfo.UserID = username;
            crConnectionInfo.Password = password;

            Tables crTables = crRep.Database.Tables;
            foreach (Table crTable in crTables)
            {
                TableLogOnInfo crTableLogOnInfo = crTable.LogOnInfo;
                crTableLogOnInfo.ConnectionInfo = crConnectionInfo;
                crTable.ApplyLogOnInfo(crTableLogOnInfo);
            }

            string criteria = "{DATA_ENTRY.BRN_CODE} = " + brnCode + " AND {DATA_ENTRY.INVOICE_NO} = '" + invoiceNo + "' AND {DATA_ENTRY.TRN_TYPE} = " + trnType;
            crRep.RecordSelectionFormula = criteria;

            string arabicWords = ToArabicWords.Convert(netAmount);
            try
            {
                if (crRep.DataDefinition.FormulaFields["aword"] != null)
                {
                    crRep.DataDefinition.FormulaFields["aword"].Text = "\"" + arabicWords + "\"";
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Warning setting aword formula: " + ex.Message);
            }

            if (!string.IsNullOrEmpty(pdfPath))
            {
                crRep.ExportToDisk(ExportFormatType.PortableDocFormat, pdfPath);
                Console.WriteLine("Success: Exported invoice " + invoiceNo + " to PDF!");
            }
            else
            {
                // Print directly to the default printer
                crRep.PrintToPrinter(1, false, 0, 0);
                Console.WriteLine("Success: Printed invoice " + invoiceNo + " successfully!");
            }
            
            crRep.Close();
            crRep.Dispose();

            return 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error: " + ex.ToString());
            return 1;
        }
    }
}
