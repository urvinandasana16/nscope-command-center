import React from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const ExportButtons = ({ tableId = "assetsTable" }) => {
    
    // 1. Export to CSV
    const exportToCSV = () => {
        const rows = document.querySelectorAll(`#${tableId} tr`);
        if (rows.length === 0) return alert("Export karne ke liye koi data nahi hai!");

        let csv = [];
        rows.forEach(row => {
            let rowData = [];
            const cols = row.querySelectorAll("td, th");
            cols.forEach(col => rowData.push(`"${col.innerText.trim().replace(/"/g, '""')}"`));
            csv.push(rowData.join(","));
        });

        const csvFile = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(csvFile);
        link.download = "NSCOPE_Assets_Report.csv";
        link.click();
    };

    // 2. Export to Excel (.xlsx)
    const exportToExcel = () => {
        const table = document.getElementById(tableId);
        if (!table) return alert("Table nahi mila!");
        
        const wb = XLSX.utils.table_to_book(table, { sheet: "N-SCOPE Assets" });
        XLSX.writeFile(wb, "NSCOPE_Assets_Report.xlsx");
    };

    // 3. Export to PDF
    const exportToPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        
        doc.setFont("helvetica", "bold");
        doc.text("N-SCOPE Command Center - Assets Report", 14, 15);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
        
        doc.autoTable({ 
            html: `#${tableId}`,
            startY: 28,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [37, 99, 235] }
        });
        
        doc.save("NSCOPE_Assets_Report.pdf");
    };

    return (
        <div style={{ display: 'inline-flex', gap: '8px', marginRight: '12px' }}>
            <button onClick={exportToCSV} style={btnStyle}>Export CSV</button>
            <button onClick={exportToExcel} style={btnStyle}>Export Excel</button>
            <button onClick={exportToPDF} style={btnStyle}>Export PDF</button>
        </div>
    );
};

// UI Styling matching your dashboard
const btnStyle = {
    backgroundColor: '#ffffff',
    color: '#333333',
    border: '1px solid #d1d5db',
    padding: '6px 14px',
    fontSize: '14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s ease',
};

export default ExportButtons;