import dayjs from "../Functions/dayjs";
import jsPDF from "jspdf";
import autoTable, { applyPlugin } from "jspdf-autotable";
import store from "../Store";
import { isWebViewAppAtom } from "../Store/atoms";
import { uploadBlob } from "../firebase/api/storage";
import { v4 as uuidv4 } from "uuid";
applyPlugin(jsPDF);

const landscapePDF = ({
  headings,
  stats,
  tables,
  filename,
}: {
  headings: {
    left: string;
    middle: string;
    right: string;
  };
  stats: {
    [key: string]: string;
  };
  tables: {
    [heading: string]: string[][];
  };
  filename: string;
}) => {
  return new Promise(async (resolve, reject) => {
    const doc = new jsPDF({
      orientation: "l",
    });
    const cursor = {
      x: 0,
      y: 0,
    };
    cursor.y = 15;
    cursor.x = 7;
    doc.setFontSize(14);
    doc.text(headings.left, cursor.x, cursor.y);

    doc.setFont("helvetica", "normal", "normal");
    doc.setFontSize(14);
    cursor.x = 148;
    doc.text(headings.middle, cursor.x, cursor.y, {
      align: "center",
    });

    doc.setFont("helvetica", "normal", "normal");
    doc.setFontSize(14);
    cursor.x = 288;
    doc.text(headings.right, cursor.x, cursor.y, {
      align: "right",
    });

    doc.line(6, 18, 291, 18);

    cursor.y = 30;
    cursor.x = 7;
    const _stats = Object.entries(stats);
    let col = 1;
    let row = 1;
    for await (const [title, value] of _stats) {
      if (row === 1) cursor.y = 30;
      else if (row === 2) cursor.y = 50;
      else if (row === 3) cursor.y = 70;

      if (col === 1) cursor.x = 7;
      else cursor.x += 75;

      if (col === 4) {
        col = 1;
        row++;
      } else col++;
      
      doc.setFont("helvetica", "normal", "normal");
      doc.setFontSize(12);
      doc.text(title, cursor.x, cursor.y);
      doc.setFont("courier", "normal", "normal");
      doc.setFontSize(12);
      cursor.y += 5;
      cursor.x += 1;
      doc.text(value, cursor.x, cursor.y);
    }

    doc.setFont("helvetica", "normal", "bold");
    // doc.setFont("", "bold");
    doc.setFontSize(15);
    cursor.y += 25;
    cursor.x = 7;
    for await (const [heading, table] of Object.entries(tables)) {
      doc.text(heading, cursor.x, cursor.y);
      cursor.y += 5;
      autoTable(doc, {
        startY: cursor.y,
        head: [table[0]],
        body: table.slice(1),
        headStyles: {
          fillColor: "#1843a6",
          textColor: "#FFF",
          halign: "center",
          valign: "middle",
        },
        styles: {
          fontSize: 10,
        },
        tableWidth: 283,
        margin: {
          left: 7,
        },
        theme: "grid",
        footStyles: {
          fillColor: "#1843a6",
          textColor: "#FFF",
          halign: "center",
          fontStyle: "bold",
        },
      });
      cursor.y = (doc as any).lastAutoTable.finalY + 20;
    }

    cursor.y = 205;
    cursor.x = 7;
    doc.setFont("helvetica", "normal", "normal");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("industrialpmr | Reports", cursor.x, cursor.y);

    cursor.x = 245;
    doc.setFont("helvetica", "normal", "normal");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(dayjs().format("hh:mm:ss A DD MMM, YYYY"), cursor.x, cursor.y);

    const isWebViewApp = store.get(isWebViewAppAtom);
    if (!isWebViewApp) doc.save(filename); //download the file normally
    else {
      const blob = doc.output("blob");
      filename = uuidv4() + ".pdf";
      const results = await uploadBlob(filename, blob);
      const path = results.ref.fullPath;
      const downloadURL = new URL(process.env.REACT_APP_FILEDOWNLOAD_SERVER_URL || window.location.href);
      downloadURL.searchParams.set("fileName", decodeURIComponent(path));

      // now alter current window location to have the download URL as &download=URL, but dont refresh the page
      const newURL = new URL(window.location.href);
      newURL.searchParams.set("download", downloadURL.toString());
      window.history.pushState({}, "", newURL.toString());
    }
    setTimeout(resolve, 2000);
  });
};
export default landscapePDF;
