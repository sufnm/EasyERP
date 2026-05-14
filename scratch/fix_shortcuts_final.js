import fs from 'fs';

function patchPage(filePath, type = 'Sales') {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove ALL existing F1/F3 keyboard listeners
    content = content.replace(/useEffect\(\(\) => \{\s*(\/\/ Shortcut listener\s*)?const handleKeyDown[\s\S]*?\}, \[.*?\]\);/g, '');
    
    const newFunction = (type === 'Purchase' || type === 'PurchaseReturn') ? 'handleHold()' : 'handleHoldAndNew()';
    const rowsVar = 'rows';
    
    // Insertion point after saveUserOptions effect
    const searchString = /useEffect\(\(\) => \{\s*if \(user\?\.userid\) \{[\s\S]*?\}\s*\}, \[autoPrint, defaultPrintPaper, showInvoiceAfterSave, enterToQty, visibleColumns, crystalPrint\]\);/;
    
    // Correct dependency array based on page type
    let deps = 'rows, customer, totals, vatNumber, address, referenceNo, paymentMethod, cashPaid, otherPaid, selectedWarehouse, selectedCurrency, selectedCurrencyRate, editingRecNo, isSaving';
    if (type === 'Purchase') {
        deps = 'supplier, rows, totals, referenceNo, vatNumber, paymentMethod, cashPaid, otherPaid, selectedWarehouse, selectedCurrency, selectedCurrencyRate, editingRecNo, isSaving';
    } else if (type === 'SalesReturn') {
        deps = 'rows, customer, totals, vatNumber, address, referenceNo, paymentMethod, cashPaid, otherPaid, selectedWarehouse, selectedCurrency, selectedCurrencyRate, editingRecNo, isSaving, selectedInvoice, invoiceItems';
    } else if (type === 'PurchaseReturn') {
        deps = 'supplier, rows, totals, referenceNo, vatNumber, paymentMethod, cashPaid, otherPaid, selectedWarehouse, selectedCurrency, selectedCurrencyRate, editingRecNo, isSaving, selectedPurchase, purchaseItems';
    }

    const shortcutsEffect = `

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        ${newFunction};
      } else if (e.key === 'F3') {
        e.preventDefault();
        const hasItems = ${rowsVar}.some(r => r.itemCode && r.itemCode.trim() !== '');
        if (!hasItems) {
          alert("Please add at least one item before proceeding.");
          return;
        }
        handleSave(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [${deps}]);`;

    if (searchString.test(content)) {
        content = content.replace(searchString, (match) => match + shortcutsEffect);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Patched ${filePath}`);
    } else {
        // Try finding a fallback insertion point
        const fallbackSearch = /const \[isSaving, setIsSaving\] = useState\(false\);/;
        if (fallbackSearch.test(content)) {
            content = content.replace(fallbackSearch, (match) => match + shortcutsEffect);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Patched ${filePath} (fallback)`);
        } else {
            console.error(`Could not find insertion point in ${filePath}`);
        }
    }
}

patchPage('src/pages/SalesPage.jsx', 'Sales');
patchPage('src/pages/PurchasePage.jsx', 'Purchase');
patchPage('src/pages/SalesReturnPage.jsx', 'SalesReturn');
patchPage('src/pages/PurchaseReturnPage.jsx', 'PurchaseReturn');
