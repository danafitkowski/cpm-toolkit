"""Opens each product workbook in real Microsoft Excel via COM, forces a full
recalculation, and uses Excel's own WorksheetFunction.IsError on every used
cell to find actual errors (not a fragile string/int match on displayed
values, which missed a real #DIV/0! on the first pass of this test).
"""
import os
import sys
import win32com.client as win32

FOLDER = os.path.expanduser(r"~\Projects\cpm-toolkit-site\products")
FILES = [
    "3-Week Lookahead Starter Template.xlsx",
    "Schedule Health Checklist.xlsx",
    "Resource Histogram Starter.xlsx",
    "Workforce Plan Template.xlsx",
    "Schedule Risk & Contingency Starter Kit.xlsx",
]

def scan_sheet_for_errors(excel, ws):
    errors = []
    used = ws.UsedRange
    is_err = excel.WorksheetFunction.IsError
    r0, c0 = used.Row, used.Column
    nrows, ncols = used.Rows.Count, used.Columns.Count
    for r in range(nrows):
        for c in range(ncols):
            cell = ws.Cells(r0 + r, c0 + c)
            if cell.Value is None:
                continue
            result = is_err(cell)
            # IsError sometimes comes back COM-wrapped as a 1-tuple depending
            # on dispatch binding; a bare tuple is always truthy in Python, so
            # unwrap it before treating it as the boolean it actually is.
            if isinstance(result, tuple):
                result = result[0]
            if result:
                errors.append((cell.Address, cell.Text, cell.Formula))
    return errors

def main():
    excel = win32.gencache.EnsureDispatch("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False
    excel.AskToUpdateLinks = False
    results = {}
    try:
        for fname in FILES:
            path = os.path.join(FOLDER, fname)
            wb = excel.Workbooks.Open(path)
            excel.CalculateFullRebuild()
            excel.CalculateUntilAsyncQueriesDone()
            file_errors = []
            for ws in wb.Worksheets:
                for addr, text, formula in scan_sheet_for_errors(excel, ws):
                    file_errors.append((ws.Name, addr, text, formula))
            results[fname] = file_errors
            wb.Close(SaveChanges=False)
        return results
    finally:
        excel.Quit()

if __name__ == "__main__":
    results = main()
    any_errors = False
    for fname, errs in results.items():
        if errs:
            any_errors = True
            print(f"[ERRORS] {fname}: {len(errs)} error cell(s)")
            for sheet, addr, text, formula in errs[:20]:
                print(f"    {sheet}!{addr} = {text}   <- {formula}")
        else:
            print(f"[CLEAN]  {fname}: 0 error cells")
    sys.exit(1 if any_errors else 0)
