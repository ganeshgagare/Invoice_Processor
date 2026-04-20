import axios from 'axios';

const BASE = '/api';

export async function uploadReport(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await axios.post(`${BASE}/reports/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return data;
}

export async function listReports() {
  const { data } = await axios.get(`${BASE}/reports`, { timeout: 10000 });
  return data;
}

export async function runQuery(reportId, prompt) {
  const { data } = await axios.post(`${BASE}/query`, { reportId, prompt }, { timeout: 60000 });
  return data;
}

export async function downloadExcel(fileName, prompt, columns, rows) {
  const response = await axios.post(
    `${BASE}/export`,
    { fileName, prompt, columns, rows },
    { responseType: 'blob', timeout: 30000 }
  );
  const url  = window.URL.createObjectURL(new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }));
  const link = document.createElement('a');
  link.href  = url;
  link.download = `${fileName.replace(/\.[^.]+$/, '')}_results.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
