import axios from 'axios';

const api = axios.create({
  baseURL: 'https://saas-production-6850.up.railway.app',
});

async function test() {
  const headers = {
    'Authorization': 'Bearer demo-guest-token',
    'X-Guest-ID': '00000000-0000-0000-0000-000000000000'
  };

  try {
    const resSheet = await api.get('/api/data/spreadsheet', { headers });
    console.log('Spreadsheet response for default guest:', resSheet.data ? { filename: resSheet.data.filename, rowsCount: resSheet.data.rows?.length } : null);
  } catch (err) {
    console.log('Spreadsheet error:', err.message);
  }

  try {
    const resDoc = await api.get('/api/data/document', { headers });
    console.log('Document response for default guest:', resDoc.data ? { filename: resDoc.data.filename, hasParsedData: resDoc.data.hasParsedData } : null);
  } catch (err) {
    console.log('Document error:', err.message);
  }
}

test();
