/**
 * Legal Metrology (Packaged Commodities) Rules, 2011 — Rule 7
 * Height of numerals and letters on the principal display panel.
 *
 * Table I (as substituted by the 2017 amendment):
 *   PDP area (cm²)     printed (mm)   blown/formed/molded (mm)
 *   A ≤ 50                  1.0                1.5
 *   50 < A ≤ 100            1.5                3.0
 *   100 < A ≤ 500           2.5                4.0
 *   500 < A ≤ 2500          4.0                6.0
 *   A > 2500                6.0                8.0
 */

const FONT_FIELDS = [
  { key: "mrp", label: "MRP numerals" },
  { key: "netQuantity", label: "Net quantity numerals" },
  { key: "manufacturingDate", label: "Month / year of pack" },
  { key: "manufacturer", label: "Manufacturer / packer" },
  { key: "customerCare", label: "Consumer care" }
];

function requiredLetterHeightMm(panelAreaCm2, molded) {
  const area = Number(panelAreaCm2);

  if (!Number.isFinite(area) || area <= 0) {
    return null;
  }

  if (area <= 50) {
    return molded ? 1.5 : 1.0;
  }

  if (area <= 100) {
    return molded ? 3.0 : 1.5;
  }

  if (area <= 500) {
    return molded ? 4.0 : 2.5;
  }

  if (area <= 2500) {
    return molded ? 6.0 : 4.0;
  }

  return molded ? 8.0 : 6.0;
}

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeUnit(value, pixelMax) {
  const n = asNumber(value);

  if (n <= 0) {
    return 0;
  }

  if (n <= 1) {
    return n;
  }

  if (n <= 100) {
    return Math.min(1, n / 100);
  }

  if (pixelMax > 0) {
    return Math.min(1, n / pixelMax);
  }

  return 1;
}

function readRegion(raw, imageWidth, imageHeight) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const x = normalizeUnit(raw.x, imageWidth);
  const y = normalizeUnit(raw.y, imageHeight);
  const width = normalizeUnit(raw.width, imageWidth);
  const height = normalizeUnit(raw.height, imageHeight);

  if (width <= 0.001 || height <= 0.001) {
    return null;
  }

  const readability = String(raw.readability || "clear")
    .toLowerCase()
    .trim();

  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
    width: Math.max(0, Math.min(1 - x, width)),
    height: Math.max(0, Math.min(1 - y, height)),
    readability:
      readability === "poor" || readability === "unreadable"
        ? readability
        : "clear"
  };
}

function getImageSize(buffer, mimeType) {
  const mime = String(mimeType || "").toLowerCase();

  try {
    if (mime.includes("png") && buffer.length >= 24) {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20)
      };
    }

    if (mime.includes("jpeg") || mime.includes("jpg")) {
      return getJpegSize(buffer);
    }

    if (mime.includes("webp")) {
      return getWebpSize(buffer);
    }
  } catch (error) {
    console.error("Could not read image dimensions:", error.message);
  }

  return { width: 0, height: 0 };
}

function getJpegSize(buffer) {
  let offset = 2;

  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];

    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }

    const length = buffer.readUInt16BE(offset + 2);

    const isSOF =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;

    if (isSOF) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }

    offset += 2 + length;
  }

  return { width: 0, height: 0 };
}

function getWebpSize(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF") {
    return { width: 0, height: 0 };
  }

  const type = buffer.toString("ascii", 12, 16);

  if (type === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff
    };
  }

  if (type === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1
    };
  }

  if (type === "VP8X" && buffer.length >= 30) {
    return {
      width:
        1 +
        (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)),
      height:
        1 +
        (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16))
    };
  }

  return { width: 0, height: 0 };
}

function analyzeFontSize({
  fontAnalysis,
  faceWidthCm,
  faceHeightCm,
  molded,
  imageWidth,
  imageHeight
}) {
  const widthCm = asNumber(faceWidthCm);
  const hasScale = widthCm > 0;

  let heightCm = asNumber(faceHeightCm);

  if (hasScale && heightCm <= 0 && imageWidth > 0 && imageHeight > 0) {
    heightCm = widthCm * (imageHeight / imageWidth);
  }

  if (hasScale && heightCm <= 0) {
    heightCm = widthCm;
  }

  const panel = readRegion(
    fontAnalysis && fontAnalysis.principalDisplayPanel,
    imageWidth,
    imageHeight
  );

  let panelAreaCm2 = null;

  if (hasScale) {
    const panelWidthCm = panel ? panel.width * widthCm : widthCm;
    const panelHeightCm = panel ? panel.height * heightCm : heightCm;
    panelAreaCm2 = Number((panelWidthCm * panelHeightCm).toFixed(1));
  }

  const requiredMm = requiredLetterHeightMm(panelAreaCm2, Boolean(molded));

  const measurements = FONT_FIELDS.map((field) => {
    const region = readRegion(
      fontAnalysis && fontAnalysis[field.key],
      imageWidth,
      imageHeight
    );

    if (!region) {
      return {
        field: field.key,
        label: field.label,
        bbox: null,
        estimatedHeightMm: null,
        requiredHeightMm: requiredMm,
        panelAreaCm2,
        readability: "missing",
        status: "REVIEW",
        rule: "Rule 7, Table I",
        message: `${field.label} could not be located tightly enough to measure letter height.`
      };
    }

    const estimatedHeightMm = hasScale
      ? Number((region.height * heightCm * 10).toFixed(2))
      : null;

    let status = "REVIEW";
    let message;

    if (!hasScale) {
      message =
        `${field.label} located. Enter the photographed face width to check Rule 7 letter height.`;
    } else if (region.readability === "unreadable") {
      status = "FAIL";
      message =
        `${field.label} is not readable. Declarations must be clear and conspicuous.`;
    } else if (requiredMm == null) {
      message = `${field.label} height ≈ ${estimatedHeightMm} mm. Could not apply Table I.`;
    } else if (estimatedHeightMm + 0.05 < requiredMm) {
      status = "FAIL";
      message =
        `${field.label} ≈ ${estimatedHeightMm} mm; Rule 7 requires at least ${requiredMm} mm for a ${panelAreaCm2} cm² panel.`;
    } else {
      status = "PASS";
      message =
        `${field.label} ≈ ${estimatedHeightMm} mm, meets Rule 7 minimum ${requiredMm} mm (Table I).`;

      if (region.readability === "poor") {
        status = "REVIEW";
        message +=
          " Contrast/readability still needs inspector confirmation.";
      }
    }

    return {
      field: field.key,
      label: field.label,
      bbox: {
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height
      },
      estimatedHeightMm,
      requiredHeightMm: requiredMm,
      panelAreaCm2,
      readability: region.readability,
      status,
      rule: "Rule 7, Table I",
      message
    };
  });

  const passed = measurements.filter((item) => item.status === "PASS").length;
  const failed = measurements.filter((item) => item.status === "FAIL").length;
  const review = measurements.filter((item) => item.status === "REVIEW").length;

  let overallStatus = "PASS";

  if (failed > 0) {
    overallStatus = "FAIL";
  } else if (review > 0) {
    overallStatus = "REVIEW";
  }

  return {
    rule: "Legal Metrology (Packaged Commodities) Rules, 2011 — Rule 7",
    table: "Table I",
    hasScale,
    molded: Boolean(molded),
    faceWidthCm: hasScale ? widthCm : null,
    faceHeightCm: hasScale ? Number(heightCm.toFixed(2)) : null,
    panelAreaCm2,
    requiredHeightMm: requiredMm,
    panelBbox: panel,
    overallStatus,
    passed,
    failed,
    review,
    measurements
  };
}

module.exports = {
  analyzeFontSize,
  getImageSize,
  requiredLetterHeightMm
};
