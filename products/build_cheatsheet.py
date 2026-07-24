"""Builds 'XER Field Reference Sheet.pdf': one-page, print-friendly."""
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT

NAVY = colors.HexColor("#14213D")
TEAL = colors.HexColor("#0F766E")
INKSOFT = colors.HexColor("#33415C")
LINE = colors.HexColor("#DDE3EA")
LIGHT = colors.HexColor("#F5F7FA")

styles = getSampleStyleSheet()
title_style = ParagraphStyle("TitleX", parent=styles["Title"], textColor=NAVY, fontSize=20, spaceAfter=2, alignment=TA_LEFT)
sub_style = ParagraphStyle("SubX", parent=styles["Normal"], textColor=INKSOFT, fontSize=9.5, spaceAfter=10)
section_style = ParagraphStyle("SectionX", parent=styles["Heading2"], textColor=colors.white, fontSize=10.5, spaceBefore=0, spaceAfter=0, leading=13)
cell_style = ParagraphStyle("CellX", parent=styles["Normal"], fontSize=8.3, leading=10.2)
field_style = ParagraphStyle("FieldX", parent=styles["Normal"], fontSize=8.3, leading=10.2, fontName="Courier")
foot_style = ParagraphStyle("FootX", parent=styles["Normal"], fontSize=7.6, textColor=INKSOFT, spaceBefore=10)

TABLES = [
    ("PROJECT (one row per schedule)", [
        ("proj_short_name", "Project code / short name as shown in P6."),
        ("plan_start_date", "The schedule's anchor start date."),
        ("last_recalc_date", "Data date: when the schedule was last recalculated."),
    ]),
    ("TASK (one row per activity)", [
        ("task_code", "Activity ID (visible in P6, not the internal task_id)."),
        ("task_name", "Activity name / description."),
        ("task_type", "TT_Task, TT_Mile, TT_FinMile, TT_WBS, or TT_LOE."),
        ("status_code", "TK_NotStarted, TK_Active, or TK_Complete."),
        ("target_drtn_hr_cnt", "Planned duration, in hours (divide by 8 for a rough day count)."),
        ("total_float_hr_cnt", "Total float, in hours. Negative means behind its own logic."),
        ("cstr_type / cstr_date", "Constraint type and date, if one is applied."),
        ("clndr_id", "Which CALENDAR row governs this activity's working days."),
    ]),
    ("TASKPRED (one row per relationship)", [
        ("task_id / pred_task_id", "Successor / predecessor, by internal task_id."),
        ("pred_type", "PR_FS, PR_SS, PR_FF, or PR_SF."),
        ("lag_hr_cnt", "Lag in hours. Negative is a lead (an overlap)."),
    ]),
    ("CALENDAR (one row per calendar)", [
        ("clndr_name", "The calendar's display name."),
        ("day_hr_cnt", "Hours counted as one working day on this calendar."),
        ("clndr_data", "Encoded work week and exceptions, not human-readable as-is."),
    ]),
    ("PROJWBS (one row per WBS node)", [
        ("wbs_short_name", "WBS code segment."),
        ("wbs_name", "WBS node name."),
        ("parent_wbs_id", "Parent node, for rebuilding the hierarchy."),
    ]),
]

def draw_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    y = 0.62 * inch
    canvas.line(0.6 * inch, y, letter[0] - 0.6 * inch, y)
    canvas.setFont("Helvetica-Oblique", 7.6)
    canvas.setFillColor(INKSOFT)
    canvas.drawString(0.6 * inch, y - 14, "CPM Toolkit  |  XER Field Reference Sheet  |  v1.0")
    canvas.drawRightString(letter[0] - 0.6 * inch, y - 14, f"Page {doc.page}")
    canvas.restoreState()


def build():
    doc = SimpleDocTemplate(
        "XER Field Reference Sheet.pdf", pagesize=letter,
        leftMargin=0.6 * inch, rightMargin=0.6 * inch,
        topMargin=0.55 * inch, bottomMargin=0.85 * inch,
        title="XER Field Reference Sheet", author="CPM Toolkit", subject="Primavera P6 XER table and field reference",
    )
    story = []
    story.append(Paragraph("XER Field Reference", title_style))
    story.append(HRFlowable(width="100%", thickness=1.6, color=TEAL, spaceBefore=2, spaceAfter=8, lineCap="round"))
    story.append(Paragraph(
        "The tables and fields people actually script against, in plain English. "
        "A .xer file is plain text: a header line, then repeating %T (table) / %F (fields) / %R (record) blocks, tab-separated.",
        sub_style))

    for name, fields in TABLES:
        header = Table([[Paragraph(name, section_style)]], colWidths=[7.3 * inch])
        header.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), TEAL),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(header)

        rows = [[Paragraph(f, field_style), Paragraph(desc, cell_style)] for f, desc in fields]
        t = Table(rows, colWidths=[2.0 * inch, 5.3 * inch])
        t.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, LIGHT]),
        ]))
        story.append(t)
        story.append(Spacer(1, 8))

    story.append(Paragraph(
        "This covers the fields used most often for scripting, QA, and quick reads. It is not the full XER schema. "
        "Every value in a .xer file is a plain string; date and number parsing is the caller's job.",
        foot_style))

    doc.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)

if __name__ == "__main__":
    build()
    print("saved")
