import writeXlsxFile, { SheetData, Row } from "write-excel-file";

interface ExcelSectionType {
  mainHeading: string;
  subHeadings: (string | number)[];
  data: (string | number)[][];
  footer: (string | number)[];
}
interface ExcelProps {
  filename: string;
  heading: string;
  sections: ExcelSectionType[];
}
const footerStyles = {
  type: String,
  fontFamily: "Calibri",
  fontSize: 14,
  fontWeight: "bold",
  color: "#000000",
  backgroundColor: "#d8d8d8",
  borderStyle: "thin",
  height: 25,
  align: "center",
  alignVertical: "center",
};
const normalStyles = {
  type: String,
  align: "center",
  fontFamily: "Calibri",
  borderStyle: "thin",
  color: "#000000",
};
const headerStyles = {
  type: String,
  fontWeight: "bold",
  align: "center",
  fontFamily: "Calibri",
  backgroundColor: "#d8d8d8",
  borderStyle: "thin",
  color: "#000000",
};
const mainHeadingStyles: Row[0] = {
  type: String,
  align: "center",
  fontFamily: "Calibri",
  fontSize: 20,
  fontWeight: "bold",
  color: "#000000",
  backgroundColor: "#d8d8d8",
  borderStyle: "thin",
};
const excelDownload = async ({
  filename,
  heading,
  sections,
}: ExcelProps): Promise<boolean> => {
  return new Promise(async (resolve, reject) => {
    // determine the biggest section and all the sections will fill up to that size using colspan
    const biggestSection = sections.reduce((prev, current) => {
      return prev.subHeadings.length > current.subHeadings.length
        ? prev
        : current;
    });
    const biggestSectionSize = biggestSection.subHeadings.length;
    const excelData: SheetData = [
      [], // empty row for spacing,
      [
        {},
        {
          value: heading,
          span: biggestSectionSize,
          ...mainHeadingStyles,
        },
      ],
      [],
    ];

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const subRow = [
        {},
        {
          value: section.mainHeading,
          span: biggestSectionSize,
          ...headerStyles,
        },
      ];
      excelData.push(subRow);
      const headerRow = [{}];
      const { length } = section.subHeadings;
      const span = Math.floor(biggestSectionSize / length);
      const remainingSpan = biggestSectionSize % length;
      // remaining span will be adjusted in the last cell
      for (let k = 0; k < length - 1; k++) {
        const cell = section.subHeadings[k];
        headerRow.push({
          value: cell,
          span,
          ...headerStyles,
        });
        //   leave spans
        for (let i = 0; i < span - 1; i++) headerRow.push(null as any);
      }
      // last cell
      const lastCell = section.subHeadings[length - 1];
      headerRow.push({
        value: lastCell,
        span: span + remainingSpan,
        ...headerStyles,
      });
      excelData.push(headerRow);
      for (let j = 0; j < section.data.length; j++) {
        const data = section.data[j];
        const row = [{}];
        const { length } = data;
        // first if the length of the data is same as the biggest section size, then just push the data
        // else we need to evenly distribute the data using colspan
        // how? if the biggest section size is 10 and the data length is 5, then we need to span each cell by 2
        // using formula: span = biggestSectionSize / length
        // if the biggest section size is 10 and the data length is 3, then we need to span each cell by 3,
        const span = Math.floor(biggestSectionSize / length);
        const remainingSpan = biggestSectionSize % length;
        // remaining span will be adjusted in the last cell
        for (let k = 0; k < length - 1; k++) {
          const cell = data[k];
          row.push({
            value: cell,
            span,
            ...normalStyles,
            type: typeof cell === "number" ? Number : String,
          });
          //   leave spans
          for (let i = 0; i < span - 1; i++) row.push(null as any);
        }
        // last cell
        const lastCell = data[length - 1];
        row.push({
          value: lastCell,
          span: span + remainingSpan,
          ...normalStyles,
          type: typeof lastCell === "number" ? Number : String,
        });
        excelData.push(row);
      }
      if (section.footer.length !== 0) {
        const footerRow = [{}];
        const { length } = section.footer;
        const span = Math.floor(biggestSectionSize / length);
        const remainingSpan = biggestSectionSize % length;
        // remaining span will be adjusted in the last cell
        for (let k = 0; k < length - 1; k++) {
          const cell = section.footer[k];
          footerRow.push({
            value: cell,
            span,
            ...footerStyles,
            type: typeof cell === "number" ? Number : String,
          });
          //   leave spans
          for (let i = 0; i < span - 1; i++) footerRow.push(null as any);
        }
        // last cell
        const lastCell = section.footer[length - 1];
        footerRow.push({
          value: lastCell,
          span: span + remainingSpan,
          ...footerStyles,
          type: typeof lastCell === "number" ? Number : String,
        });
        excelData.push(footerRow);
      }
      excelData.push([]);
    }

    const columns = [{}];
    for (let i = 0; i < biggestSectionSize; i++) {
      columns.push({
        width: 22,
      });
    }
    try {
      await writeXlsxFile(excelData, {
        columns,
        fileName: filename,
      });
      setTimeout(() => {
        resolve(true);
      }, 2000);
    } catch (err) {
      reject(err);
    }
  });
};

export type { ExcelSectionType, ExcelProps };
export default excelDownload;
