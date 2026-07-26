export type BoardExportItem = {
  id: string;
  date: string;          // 날짜 (YYYY-MM-DD)
  title: string;         // 항목명 / 과업지시서명
  status: string;        // 상태 (분석완료, 매칭중, 후보선정, 강사선정/완료 등)
  assignee: string;      // 담당자
  memo?: string;         // 코멘트 / 비고
};

/**
  * 보드 데이터를 구글 시트에 바로 붙여넣을 수 있는 TSV 텍스트로 변환
  */
export function formatForGoogleSheets(items: BoardExportItem[]): string {
  const headers = ['날짜', '상태/단계', '과업지시서/프로젝트명', '담당자', '코멘트/메모'];
  const rows = items.map((item) => [
    item.date,
    item.status,
    item.title,
    item.assignee || '담당자 미지정',
    item.memo || '',
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join('\t'))
    .join('\n');
}

/**
  * 클립보드에 TSV 포맷으로 복사 (구글 시트 Ctrl+V 바로 붙여넣기용)
  */
export async function copyToGoogleSheetsClipboard(items: BoardExportItem[]): Promise<boolean> {
  try {
    const text = formatForGoogleSheets(items);
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
  * Google Sheets / 엑셀 한글 깨짐 방지 UTF-8 BOM CSV 파일 다운로드
  */
export function downloadCsvForGoogleSheets(items: BoardExportItem[], filename = 'kanban_board_export.csv') {
  const headers = ['날짜', '상태/단계', '과업지시서/프로젝트명', '담당자', '코멘트/메모'];
  const rows = items.map((item) => [
    item.date,
    item.status,
    item.title,
    item.assignee || '담당자 미지정',
    item.memo || '',
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  // UTF-8 BOM 추가
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
