import fs from 'fs';

function addShortcuts(filePath, indent = '  ', type = 'Sales') {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it already has F1 shortcut
    if (content.includes('e.key === \'F1\'') || content.includes('e.key === "F1"')) {
        console.log(`Updating existing shortcuts in ${filePath}`);
        // Replace existing F1 block with F1 and F3
        content = content.replace(
            /if\s*\(e\.key\s*===\s*['"]F1['"]\)\s*\{[\s\S]*?handleHold\(\);\s*\}/,
            `if (e.key === 'F1') {
        e.preventDefault();
        handleHold();
      } else if (e.key === 'F3') {
        e.preventDefault();
        handleSave(true);
      }`
        );
        // Also update dependencies if it's an existing useEffect
        content = content.replace(
            /\}, \[supplier, rows, totals, referenceNo, vatNumber\]\);/,
            `}, [supplier, rows, totals, referenceNo, vatNumber, paymentMethod, cashPaid, otherPaid, selectedWarehouse, selectedCurrency, selectedCurrencyRate, editingRecNo, isSaving]);`
        );
        fs.writeFileSync(filePath, content, 'utf8');
        return;
    }

    // For others, insert after saveUserOptions effect or similar
    const searchString = /useEffect\(\(\) => \{\s*if \(user\?\.userid\) \{[\s\S]*?\}\s*\}, \[autoPrint, defaultPrintPaper, showInvoiceAfterSave, enterToQty, visibleColumns, crystalPrint\]\);/;
    const newFunction = type === 'Purchase' ? 'handleHold()' : 'handleHoldAndNew()';
    const shortcutsEffect = `

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        ${newFunction};
      } else if (e.key === 'F3') {
        e.preventDefault();
        handleSave(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rows, customer, totals, vatNumber, address, referenceNo, paymentMethod, cashPaid, otherPaid, selectedWarehouse, selectedCurrency, selectedCurrencyRate, editingRecNo, isSaving]);`;

    if (searchString.test(content)) {
        content = content.replace(searchString, (match) => match + shortcutsEffect);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Added shortcuts to ${filePath}`);
    } else {
        console.error(`Could not find insertion point in ${filePath}`);
    }
}

// addShortcuts('src/pages/SalesPage.jsx', '  ', 'Sales'); // Already added
addShortcuts('src/pages/PurchasePage.jsx', '  ', 'Purchase');
// addShortcuts('src/pages/SalesReturnPage.jsx', '  ', 'Sales'); // Already added
addShortcuts('src/pages/PurchaseReturnPage.jsx', '  ', 'Purchase');
