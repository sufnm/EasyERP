import fs from 'fs';

function patchFile(filePath, target, replacement) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(target)) {
    const newContent = content.replace(target, replacement);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Successfully patched ${filePath}`);
  } else {
    console.error(`Target not found in ${filePath}`);
    // Print a few lines of the file to see what's wrong
    const lines = content.split('\n');
    const idx = lines.findIndex(l => l.includes('VAT_AMOUNT: totals.vat'));
    if (idx !== -1) {
      console.log('Found similar line at index', idx);
      console.log('Line content:', JSON.stringify(lines[idx]));
    }
  }
}

const targetStr = '      VAT_AMOUNT: totals.vat * selectedCurrencyRate,';
const replacementStr = '      VAT_AMOUNT: totals.vat * selectedCurrencyRate,\n      TAXABLE_AMOUNT: (totals.net - totals.vat) * selectedCurrencyRate,\n      FRN_AMOUNT: totals.net,';

patchFile('src/pages/PurchasePage.jsx', targetStr, replacementStr);
patchFile('src/pages/PurchaseReturnPage.jsx', targetStr, replacementStr);
