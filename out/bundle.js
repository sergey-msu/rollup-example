var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getAugmentedNamespace(n) {
  var f = n.default;
	if (typeof f == "function") {
		var a = function a () {
			if (this instanceof a) {
				var args = [null];
				args.push.apply(args, arguments);
				var Ctor = Function.bind.apply(f, args);
				return new Ctor();
			}
			return f.apply(this, arguments);
		};
		a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, '__esModule', {value: true});
	Object.keys(n).forEach(function (k) {
		var d = Object.getOwnPropertyDescriptor(n, k);
		Object.defineProperty(a, k, d.get ? d : {
			enumerable: true,
			get: function () {
				return n[k];
			}
		});
	});
	return a;
}

// can-promise has a crash in some versions of react native that dont have
// standard global objects
// https://github.com/soldair/node-qrcode/issues/157

var canPromise$1 = function () {
  return typeof Promise === 'function' && Promise.prototype && Promise.prototype.then
};

var qrcode = {};

var utils$1 = {};

let toSJISFunction;
const CODEWORDS_COUNT = [
  0, // Not used
  26, 44, 70, 100, 134, 172, 196, 242, 292, 346,
  404, 466, 532, 581, 655, 733, 815, 901, 991, 1085,
  1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185,
  2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706
];

/**
 * Returns the QR Code size for the specified version
 *
 * @param  {Number} version QR Code version
 * @return {Number}         size of QR code
 */
utils$1.getSymbolSize = function getSymbolSize (version) {
  if (!version) throw new Error('"version" cannot be null or undefined')
  if (version < 1 || version > 40) throw new Error('"version" should be in range from 1 to 40')
  return version * 4 + 17
};

/**
 * Returns the total number of codewords used to store data and EC information.
 *
 * @param  {Number} version QR Code version
 * @return {Number}         Data length in bits
 */
utils$1.getSymbolTotalCodewords = function getSymbolTotalCodewords (version) {
  return CODEWORDS_COUNT[version]
};

/**
 * Encode data with Bose-Chaudhuri-Hocquenghem
 *
 * @param  {Number} data Value to encode
 * @return {Number}      Encoded value
 */
utils$1.getBCHDigit = function (data) {
  let digit = 0;

  while (data !== 0) {
    digit++;
    data >>>= 1;
  }

  return digit
};

utils$1.setToSJISFunction = function setToSJISFunction (f) {
  if (typeof f !== 'function') {
    throw new Error('"toSJISFunc" is not a valid function.')
  }

  toSJISFunction = f;
};

utils$1.isKanjiModeEnabled = function () {
  return typeof toSJISFunction !== 'undefined'
};

utils$1.toSJIS = function toSJIS (kanji) {
  return toSJISFunction(kanji)
};

var errorCorrectionLevel = {};

(function (exports) {
	exports.L = { bit: 1 };
	exports.M = { bit: 0 };
	exports.Q = { bit: 3 };
	exports.H = { bit: 2 };

	function fromString (string) {
	  if (typeof string !== 'string') {
	    throw new Error('Param is not a string')
	  }

	  const lcStr = string.toLowerCase();

	  switch (lcStr) {
	    case 'l':
	    case 'low':
	      return exports.L

	    case 'm':
	    case 'medium':
	      return exports.M

	    case 'q':
	    case 'quartile':
	      return exports.Q

	    case 'h':
	    case 'high':
	      return exports.H

	    default:
	      throw new Error('Unknown EC Level: ' + string)
	  }
	}

	exports.isValid = function isValid (level) {
	  return level && typeof level.bit !== 'undefined' &&
	    level.bit >= 0 && level.bit < 4
	};

	exports.from = function from (value, defaultValue) {
	  if (exports.isValid(value)) {
	    return value
	  }

	  try {
	    return fromString(value)
	  } catch (e) {
	    return defaultValue
	  }
	};
} (errorCorrectionLevel));

function BitBuffer$1 () {
  this.buffer = [];
  this.length = 0;
}

BitBuffer$1.prototype = {

  get: function (index) {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) === 1
  },

  put: function (num, length) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  },

  getLengthInBits: function () {
    return this.length
  },

  putBit: function (bit) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }

    if (bit) {
      this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
    }

    this.length++;
  }
};

var bitBuffer = BitBuffer$1;

/**
 * Helper class to handle QR Code symbol modules
 *
 * @param {Number} size Symbol size
 */

function BitMatrix$1 (size) {
  if (!size || size < 1) {
    throw new Error('BitMatrix size must be defined and greater than 0')
  }

  this.size = size;
  this.data = new Uint8Array(size * size);
  this.reservedBit = new Uint8Array(size * size);
}

/**
 * Set bit value at specified location
 * If reserved flag is set, this bit will be ignored during masking process
 *
 * @param {Number}  row
 * @param {Number}  col
 * @param {Boolean} value
 * @param {Boolean} reserved
 */
BitMatrix$1.prototype.set = function (row, col, value, reserved) {
  const index = row * this.size + col;
  this.data[index] = value;
  if (reserved) this.reservedBit[index] = true;
};

/**
 * Returns bit value at specified location
 *
 * @param  {Number}  row
 * @param  {Number}  col
 * @return {Boolean}
 */
BitMatrix$1.prototype.get = function (row, col) {
  return this.data[row * this.size + col]
};

/**
 * Applies xor operator at specified location
 * (used during masking process)
 *
 * @param {Number}  row
 * @param {Number}  col
 * @param {Boolean} value
 */
BitMatrix$1.prototype.xor = function (row, col, value) {
  this.data[row * this.size + col] ^= value;
};

/**
 * Check if bit at specified location is reserved
 *
 * @param {Number}   row
 * @param {Number}   col
 * @return {Boolean}
 */
BitMatrix$1.prototype.isReserved = function (row, col) {
  return this.reservedBit[row * this.size + col]
};

var bitMatrix = BitMatrix$1;

var alignmentPattern = {};

/**
 * Alignment pattern are fixed reference pattern in defined positions
 * in a matrix symbology, which enables the decode software to re-synchronise
 * the coordinate mapping of the image modules in the event of moderate amounts
 * of distortion of the image.
 *
 * Alignment patterns are present only in QR Code symbols of version 2 or larger
 * and their number depends on the symbol version.
 */

(function (exports) {
	const getSymbolSize = utils$1.getSymbolSize;

	/**
	 * Calculate the row/column coordinates of the center module of each alignment pattern
	 * for the specified QR Code version.
	 *
	 * The alignment patterns are positioned symmetrically on either side of the diagonal
	 * running from the top left corner of the symbol to the bottom right corner.
	 *
	 * Since positions are simmetrical only half of the coordinates are returned.
	 * Each item of the array will represent in turn the x and y coordinate.
	 * @see {@link getPositions}
	 *
	 * @param  {Number} version QR Code version
	 * @return {Array}          Array of coordinate
	 */
	exports.getRowColCoords = function getRowColCoords (version) {
	  if (version === 1) return []

	  const posCount = Math.floor(version / 7) + 2;
	  const size = getSymbolSize(version);
	  const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
	  const positions = [size - 7]; // Last coord is always (size - 7)

	  for (let i = 1; i < posCount - 1; i++) {
	    positions[i] = positions[i - 1] - intervals;
	  }

	  positions.push(6); // First coord is always 6

	  return positions.reverse()
	};

	/**
	 * Returns an array containing the positions of each alignment pattern.
	 * Each array's element represent the center point of the pattern as (x, y) coordinates
	 *
	 * Coordinates are calculated expanding the row/column coordinates returned by {@link getRowColCoords}
	 * and filtering out the items that overlaps with finder pattern
	 *
	 * @example
	 * For a Version 7 symbol {@link getRowColCoords} returns values 6, 22 and 38.
	 * The alignment patterns, therefore, are to be centered on (row, column)
	 * positions (6,22), (22,6), (22,22), (22,38), (38,22), (38,38).
	 * Note that the coordinates (6,6), (6,38), (38,6) are occupied by finder patterns
	 * and are not therefore used for alignment patterns.
	 *
	 * let pos = getPositions(7)
	 * // [[6,22], [22,6], [22,22], [22,38], [38,22], [38,38]]
	 *
	 * @param  {Number} version QR Code version
	 * @return {Array}          Array of coordinates
	 */
	exports.getPositions = function getPositions (version) {
	  const coords = [];
	  const pos = exports.getRowColCoords(version);
	  const posLength = pos.length;

	  for (let i = 0; i < posLength; i++) {
	    for (let j = 0; j < posLength; j++) {
	      // Skip if position is occupied by finder patterns
	      if ((i === 0 && j === 0) || // top-left
	          (i === 0 && j === posLength - 1) || // bottom-left
	          (i === posLength - 1 && j === 0)) { // top-right
	        continue
	      }

	      coords.push([pos[i], pos[j]]);
	    }
	  }

	  return coords
	};
} (alignmentPattern));

var finderPattern = {};

const getSymbolSize = utils$1.getSymbolSize;
const FINDER_PATTERN_SIZE = 7;

/**
 * Returns an array containing the positions of each finder pattern.
 * Each array's element represent the top-left point of the pattern as (x, y) coordinates
 *
 * @param  {Number} version QR Code version
 * @return {Array}          Array of coordinates
 */
finderPattern.getPositions = function getPositions (version) {
  const size = getSymbolSize(version);

  return [
    // top-left
    [0, 0],
    // top-right
    [size - FINDER_PATTERN_SIZE, 0],
    // bottom-left
    [0, size - FINDER_PATTERN_SIZE]
  ]
};

var maskPattern = {};

/**
 * Data mask pattern reference
 * @type {Object}
 */

(function (exports) {
	exports.Patterns = {
	  PATTERN000: 0,
	  PATTERN001: 1,
	  PATTERN010: 2,
	  PATTERN011: 3,
	  PATTERN100: 4,
	  PATTERN101: 5,
	  PATTERN110: 6,
	  PATTERN111: 7
	};

	/**
	 * Weighted penalty scores for the undesirable features
	 * @type {Object}
	 */
	const PenaltyScores = {
	  N1: 3,
	  N2: 3,
	  N3: 40,
	  N4: 10
	};

	/**
	 * Check if mask pattern value is valid
	 *
	 * @param  {Number}  mask    Mask pattern
	 * @return {Boolean}         true if valid, false otherwise
	 */
	exports.isValid = function isValid (mask) {
	  return mask != null && mask !== '' && !isNaN(mask) && mask >= 0 && mask <= 7
	};

	/**
	 * Returns mask pattern from a value.
	 * If value is not valid, returns undefined
	 *
	 * @param  {Number|String} value        Mask pattern value
	 * @return {Number}                     Valid mask pattern or undefined
	 */
	exports.from = function from (value) {
	  return exports.isValid(value) ? parseInt(value, 10) : undefined
	};

	/**
	* Find adjacent modules in row/column with the same color
	* and assign a penalty value.
	*
	* Points: N1 + i
	* i is the amount by which the number of adjacent modules of the same color exceeds 5
	*/
	exports.getPenaltyN1 = function getPenaltyN1 (data) {
	  const size = data.size;
	  let points = 0;
	  let sameCountCol = 0;
	  let sameCountRow = 0;
	  let lastCol = null;
	  let lastRow = null;

	  for (let row = 0; row < size; row++) {
	    sameCountCol = sameCountRow = 0;
	    lastCol = lastRow = null;

	    for (let col = 0; col < size; col++) {
	      let module = data.get(row, col);
	      if (module === lastCol) {
	        sameCountCol++;
	      } else {
	        if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
	        lastCol = module;
	        sameCountCol = 1;
	      }

	      module = data.get(col, row);
	      if (module === lastRow) {
	        sameCountRow++;
	      } else {
	        if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
	        lastRow = module;
	        sameCountRow = 1;
	      }
	    }

	    if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
	    if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
	  }

	  return points
	};

	/**
	 * Find 2x2 blocks with the same color and assign a penalty value
	 *
	 * Points: N2 * (m - 1) * (n - 1)
	 */
	exports.getPenaltyN2 = function getPenaltyN2 (data) {
	  const size = data.size;
	  let points = 0;

	  for (let row = 0; row < size - 1; row++) {
	    for (let col = 0; col < size - 1; col++) {
	      const last = data.get(row, col) +
	        data.get(row, col + 1) +
	        data.get(row + 1, col) +
	        data.get(row + 1, col + 1);

	      if (last === 4 || last === 0) points++;
	    }
	  }

	  return points * PenaltyScores.N2
	};

	/**
	 * Find 1:1:3:1:1 ratio (dark:light:dark:light:dark) pattern in row/column,
	 * preceded or followed by light area 4 modules wide
	 *
	 * Points: N3 * number of pattern found
	 */
	exports.getPenaltyN3 = function getPenaltyN3 (data) {
	  const size = data.size;
	  let points = 0;
	  let bitsCol = 0;
	  let bitsRow = 0;

	  for (let row = 0; row < size; row++) {
	    bitsCol = bitsRow = 0;
	    for (let col = 0; col < size; col++) {
	      bitsCol = ((bitsCol << 1) & 0x7FF) | data.get(row, col);
	      if (col >= 10 && (bitsCol === 0x5D0 || bitsCol === 0x05D)) points++;

	      bitsRow = ((bitsRow << 1) & 0x7FF) | data.get(col, row);
	      if (col >= 10 && (bitsRow === 0x5D0 || bitsRow === 0x05D)) points++;
	    }
	  }

	  return points * PenaltyScores.N3
	};

	/**
	 * Calculate proportion of dark modules in entire symbol
	 *
	 * Points: N4 * k
	 *
	 * k is the rating of the deviation of the proportion of dark modules
	 * in the symbol from 50% in steps of 5%
	 */
	exports.getPenaltyN4 = function getPenaltyN4 (data) {
	  let darkCount = 0;
	  const modulesCount = data.data.length;

	  for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];

	  const k = Math.abs(Math.ceil((darkCount * 100 / modulesCount) / 5) - 10);

	  return k * PenaltyScores.N4
	};

	/**
	 * Return mask value at given position
	 *
	 * @param  {Number} maskPattern Pattern reference value
	 * @param  {Number} i           Row
	 * @param  {Number} j           Column
	 * @return {Boolean}            Mask value
	 */
	function getMaskAt (maskPattern, i, j) {
	  switch (maskPattern) {
	    case exports.Patterns.PATTERN000: return (i + j) % 2 === 0
	    case exports.Patterns.PATTERN001: return i % 2 === 0
	    case exports.Patterns.PATTERN010: return j % 3 === 0
	    case exports.Patterns.PATTERN011: return (i + j) % 3 === 0
	    case exports.Patterns.PATTERN100: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0
	    case exports.Patterns.PATTERN101: return (i * j) % 2 + (i * j) % 3 === 0
	    case exports.Patterns.PATTERN110: return ((i * j) % 2 + (i * j) % 3) % 2 === 0
	    case exports.Patterns.PATTERN111: return ((i * j) % 3 + (i + j) % 2) % 2 === 0

	    default: throw new Error('bad maskPattern:' + maskPattern)
	  }
	}

	/**
	 * Apply a mask pattern to a BitMatrix
	 *
	 * @param  {Number}    pattern Pattern reference number
	 * @param  {BitMatrix} data    BitMatrix data
	 */
	exports.applyMask = function applyMask (pattern, data) {
	  const size = data.size;

	  for (let col = 0; col < size; col++) {
	    for (let row = 0; row < size; row++) {
	      if (data.isReserved(row, col)) continue
	      data.xor(row, col, getMaskAt(pattern, row, col));
	    }
	  }
	};

	/**
	 * Returns the best mask pattern for data
	 *
	 * @param  {BitMatrix} data
	 * @return {Number} Mask pattern reference number
	 */
	exports.getBestMask = function getBestMask (data, setupFormatFunc) {
	  const numPatterns = Object.keys(exports.Patterns).length;
	  let bestPattern = 0;
	  let lowerPenalty = Infinity;

	  for (let p = 0; p < numPatterns; p++) {
	    setupFormatFunc(p);
	    exports.applyMask(p, data);

	    // Calculate penalty
	    const penalty =
	      exports.getPenaltyN1(data) +
	      exports.getPenaltyN2(data) +
	      exports.getPenaltyN3(data) +
	      exports.getPenaltyN4(data);

	    // Undo previously applied mask
	    exports.applyMask(p, data);

	    if (penalty < lowerPenalty) {
	      lowerPenalty = penalty;
	      bestPattern = p;
	    }
	  }

	  return bestPattern
	};
} (maskPattern));

var errorCorrectionCode = {};

const ECLevel$1 = errorCorrectionLevel;

const EC_BLOCKS_TABLE = [
// L  M  Q  H
  1, 1, 1, 1,
  1, 1, 1, 1,
  1, 1, 2, 2,
  1, 2, 2, 4,
  1, 2, 4, 4,
  2, 4, 4, 4,
  2, 4, 6, 5,
  2, 4, 6, 6,
  2, 5, 8, 8,
  4, 5, 8, 8,
  4, 5, 8, 11,
  4, 8, 10, 11,
  4, 9, 12, 16,
  4, 9, 16, 16,
  6, 10, 12, 18,
  6, 10, 17, 16,
  6, 11, 16, 19,
  6, 13, 18, 21,
  7, 14, 21, 25,
  8, 16, 20, 25,
  8, 17, 23, 25,
  9, 17, 23, 34,
  9, 18, 25, 30,
  10, 20, 27, 32,
  12, 21, 29, 35,
  12, 23, 34, 37,
  12, 25, 34, 40,
  13, 26, 35, 42,
  14, 28, 38, 45,
  15, 29, 40, 48,
  16, 31, 43, 51,
  17, 33, 45, 54,
  18, 35, 48, 57,
  19, 37, 51, 60,
  19, 38, 53, 63,
  20, 40, 56, 66,
  21, 43, 59, 70,
  22, 45, 62, 74,
  24, 47, 65, 77,
  25, 49, 68, 81
];

const EC_CODEWORDS_TABLE = [
// L  M  Q  H
  7, 10, 13, 17,
  10, 16, 22, 28,
  15, 26, 36, 44,
  20, 36, 52, 64,
  26, 48, 72, 88,
  36, 64, 96, 112,
  40, 72, 108, 130,
  48, 88, 132, 156,
  60, 110, 160, 192,
  72, 130, 192, 224,
  80, 150, 224, 264,
  96, 176, 260, 308,
  104, 198, 288, 352,
  120, 216, 320, 384,
  132, 240, 360, 432,
  144, 280, 408, 480,
  168, 308, 448, 532,
  180, 338, 504, 588,
  196, 364, 546, 650,
  224, 416, 600, 700,
  224, 442, 644, 750,
  252, 476, 690, 816,
  270, 504, 750, 900,
  300, 560, 810, 960,
  312, 588, 870, 1050,
  336, 644, 952, 1110,
  360, 700, 1020, 1200,
  390, 728, 1050, 1260,
  420, 784, 1140, 1350,
  450, 812, 1200, 1440,
  480, 868, 1290, 1530,
  510, 924, 1350, 1620,
  540, 980, 1440, 1710,
  570, 1036, 1530, 1800,
  570, 1064, 1590, 1890,
  600, 1120, 1680, 1980,
  630, 1204, 1770, 2100,
  660, 1260, 1860, 2220,
  720, 1316, 1950, 2310,
  750, 1372, 2040, 2430
];

/**
 * Returns the number of error correction block that the QR Code should contain
 * for the specified version and error correction level.
 *
 * @param  {Number} version              QR Code version
 * @param  {Number} errorCorrectionLevel Error correction level
 * @return {Number}                      Number of error correction blocks
 */
errorCorrectionCode.getBlocksCount = function getBlocksCount (version, errorCorrectionLevel) {
  switch (errorCorrectionLevel) {
    case ECLevel$1.L:
      return EC_BLOCKS_TABLE[(version - 1) * 4 + 0]
    case ECLevel$1.M:
      return EC_BLOCKS_TABLE[(version - 1) * 4 + 1]
    case ECLevel$1.Q:
      return EC_BLOCKS_TABLE[(version - 1) * 4 + 2]
    case ECLevel$1.H:
      return EC_BLOCKS_TABLE[(version - 1) * 4 + 3]
    default:
      return undefined
  }
};

/**
 * Returns the number of error correction codewords to use for the specified
 * version and error correction level.
 *
 * @param  {Number} version              QR Code version
 * @param  {Number} errorCorrectionLevel Error correction level
 * @return {Number}                      Number of error correction codewords
 */
errorCorrectionCode.getTotalCodewordsCount = function getTotalCodewordsCount (version, errorCorrectionLevel) {
  switch (errorCorrectionLevel) {
    case ECLevel$1.L:
      return EC_CODEWORDS_TABLE[(version - 1) * 4 + 0]
    case ECLevel$1.M:
      return EC_CODEWORDS_TABLE[(version - 1) * 4 + 1]
    case ECLevel$1.Q:
      return EC_CODEWORDS_TABLE[(version - 1) * 4 + 2]
    case ECLevel$1.H:
      return EC_CODEWORDS_TABLE[(version - 1) * 4 + 3]
    default:
      return undefined
  }
};

var polynomial = {};

var galoisField = {};

const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256)
/**
 * Precompute the log and anti-log tables for faster computation later
 *
 * For each possible value in the galois field 2^8, we will pre-compute
 * the logarithm and anti-logarithm (exponential) of this value
 *
 * ref {@link https://en.wikiversity.org/wiki/Reed%E2%80%93Solomon_codes_for_coders#Introduction_to_mathematical_fields}
 */
;(function initTables () {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;

    x <<= 1; // multiply by 2

    // The QR code specification says to use byte-wise modulo 100011101 arithmetic.
    // This means that when a number is 256 or larger, it should be XORed with 0x11D.
    if (x & 0x100) { // similar to x >= 256, but a lot faster (because 0x100 == 256)
      x ^= 0x11D;
    }
  }

  // Optimization: double the size of the anti-log table so that we don't need to mod 255 to
  // stay inside the bounds (because we will mainly use this table for the multiplication of
  // two GF numbers, no more).
  // @see {@link mul}
  for (let i = 255; i < 512; i++) {
    EXP_TABLE[i] = EXP_TABLE[i - 255];
  }
}());

/**
 * Returns log value of n inside Galois Field
 *
 * @param  {Number} n
 * @return {Number}
 */
galoisField.log = function log (n) {
  if (n < 1) throw new Error('log(' + n + ')')
  return LOG_TABLE[n]
};

/**
 * Returns anti-log value of n inside Galois Field
 *
 * @param  {Number} n
 * @return {Number}
 */
galoisField.exp = function exp (n) {
  return EXP_TABLE[n]
};

/**
 * Multiplies two number inside Galois Field
 *
 * @param  {Number} x
 * @param  {Number} y
 * @return {Number}
 */
galoisField.mul = function mul (x, y) {
  if (x === 0 || y === 0) return 0

  // should be EXP_TABLE[(LOG_TABLE[x] + LOG_TABLE[y]) % 255] if EXP_TABLE wasn't oversized
  // @see {@link initTables}
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]]
};

(function (exports) {
	const GF = galoisField;

	/**
	 * Multiplies two polynomials inside Galois Field
	 *
	 * @param  {Uint8Array} p1 Polynomial
	 * @param  {Uint8Array} p2 Polynomial
	 * @return {Uint8Array}    Product of p1 and p2
	 */
	exports.mul = function mul (p1, p2) {
	  const coeff = new Uint8Array(p1.length + p2.length - 1);

	  for (let i = 0; i < p1.length; i++) {
	    for (let j = 0; j < p2.length; j++) {
	      coeff[i + j] ^= GF.mul(p1[i], p2[j]);
	    }
	  }

	  return coeff
	};

	/**
	 * Calculate the remainder of polynomials division
	 *
	 * @param  {Uint8Array} divident Polynomial
	 * @param  {Uint8Array} divisor  Polynomial
	 * @return {Uint8Array}          Remainder
	 */
	exports.mod = function mod (divident, divisor) {
	  let result = new Uint8Array(divident);

	  while ((result.length - divisor.length) >= 0) {
	    const coeff = result[0];

	    for (let i = 0; i < divisor.length; i++) {
	      result[i] ^= GF.mul(divisor[i], coeff);
	    }

	    // remove all zeros from buffer head
	    let offset = 0;
	    while (offset < result.length && result[offset] === 0) offset++;
	    result = result.slice(offset);
	  }

	  return result
	};

	/**
	 * Generate an irreducible generator polynomial of specified degree
	 * (used by Reed-Solomon encoder)
	 *
	 * @param  {Number} degree Degree of the generator polynomial
	 * @return {Uint8Array}    Buffer containing polynomial coefficients
	 */
	exports.generateECPolynomial = function generateECPolynomial (degree) {
	  let poly = new Uint8Array([1]);
	  for (let i = 0; i < degree; i++) {
	    poly = exports.mul(poly, new Uint8Array([1, GF.exp(i)]));
	  }

	  return poly
	};
} (polynomial));

const Polynomial = polynomial;

function ReedSolomonEncoder$1 (degree) {
  this.genPoly = undefined;
  this.degree = degree;

  if (this.degree) this.initialize(this.degree);
}

/**
 * Initialize the encoder.
 * The input param should correspond to the number of error correction codewords.
 *
 * @param  {Number} degree
 */
ReedSolomonEncoder$1.prototype.initialize = function initialize (degree) {
  // create an irreducible generator polynomial
  this.degree = degree;
  this.genPoly = Polynomial.generateECPolynomial(this.degree);
};

/**
 * Encodes a chunk of data
 *
 * @param  {Uint8Array} data Buffer containing input data
 * @return {Uint8Array}      Buffer containing encoded data
 */
ReedSolomonEncoder$1.prototype.encode = function encode (data) {
  if (!this.genPoly) {
    throw new Error('Encoder not initialized')
  }

  // Calculate EC for this data block
  // extends data size to data+genPoly size
  const paddedData = new Uint8Array(data.length + this.degree);
  paddedData.set(data);

  // The error correction codewords are the remainder after dividing the data codewords
  // by a generator polynomial
  const remainder = Polynomial.mod(paddedData, this.genPoly);

  // return EC data blocks (last n byte, where n is the degree of genPoly)
  // If coefficients number in remainder are less than genPoly degree,
  // pad with 0s to the left to reach the needed number of coefficients
  const start = this.degree - remainder.length;
  if (start > 0) {
    const buff = new Uint8Array(this.degree);
    buff.set(remainder, start);

    return buff
  }

  return remainder
};

var reedSolomonEncoder = ReedSolomonEncoder$1;

var version$1 = {};

var mode = {};

var versionCheck = {};

/**
 * Check if QR Code version is valid
 *
 * @param  {Number}  version QR Code version
 * @return {Boolean}         true if valid version, false otherwise
 */

versionCheck.isValid = function isValid (version) {
  return !isNaN(version) && version >= 1 && version <= 40
};

var regex = {};

const numeric = '[0-9]+';
const alphanumeric = '[A-Z $%*+\\-./:]+';
let kanji = '(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|' +
  '[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|' +
  '[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|' +
  '[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+';
kanji = kanji.replace(/u/g, '\\u');

const byte = '(?:(?![A-Z0-9 $%*+\\-./:]|' + kanji + ')(?:.|[\r\n]))+';

regex.KANJI = new RegExp(kanji, 'g');
regex.BYTE_KANJI = new RegExp('[^A-Z0-9 $%*+\\-./:]+', 'g');
regex.BYTE = new RegExp(byte, 'g');
regex.NUMERIC = new RegExp(numeric, 'g');
regex.ALPHANUMERIC = new RegExp(alphanumeric, 'g');

const TEST_KANJI = new RegExp('^' + kanji + '$');
const TEST_NUMERIC = new RegExp('^' + numeric + '$');
const TEST_ALPHANUMERIC = new RegExp('^[A-Z0-9 $%*+\\-./:]+$');

regex.testKanji = function testKanji (str) {
  return TEST_KANJI.test(str)
};

regex.testNumeric = function testNumeric (str) {
  return TEST_NUMERIC.test(str)
};

regex.testAlphanumeric = function testAlphanumeric (str) {
  return TEST_ALPHANUMERIC.test(str)
};

(function (exports) {
	const VersionCheck = versionCheck;
	const Regex = regex;

	/**
	 * Numeric mode encodes data from the decimal digit set (0 - 9)
	 * (byte values 30HEX to 39HEX).
	 * Normally, 3 data characters are represented by 10 bits.
	 *
	 * @type {Object}
	 */
	exports.NUMERIC = {
	  id: 'Numeric',
	  bit: 1 << 0,
	  ccBits: [10, 12, 14]
	};

	/**
	 * Alphanumeric mode encodes data from a set of 45 characters,
	 * i.e. 10 numeric digits (0 - 9),
	 *      26 alphabetic characters (A - Z),
	 *   and 9 symbols (SP, $, %, *, +, -, ., /, :).
	 * Normally, two input characters are represented by 11 bits.
	 *
	 * @type {Object}
	 */
	exports.ALPHANUMERIC = {
	  id: 'Alphanumeric',
	  bit: 1 << 1,
	  ccBits: [9, 11, 13]
	};

	/**
	 * In byte mode, data is encoded at 8 bits per character.
	 *
	 * @type {Object}
	 */
	exports.BYTE = {
	  id: 'Byte',
	  bit: 1 << 2,
	  ccBits: [8, 16, 16]
	};

	/**
	 * The Kanji mode efficiently encodes Kanji characters in accordance with
	 * the Shift JIS system based on JIS X 0208.
	 * The Shift JIS values are shifted from the JIS X 0208 values.
	 * JIS X 0208 gives details of the shift coded representation.
	 * Each two-byte character value is compacted to a 13-bit binary codeword.
	 *
	 * @type {Object}
	 */
	exports.KANJI = {
	  id: 'Kanji',
	  bit: 1 << 3,
	  ccBits: [8, 10, 12]
	};

	/**
	 * Mixed mode will contain a sequences of data in a combination of any of
	 * the modes described above
	 *
	 * @type {Object}
	 */
	exports.MIXED = {
	  bit: -1
	};

	/**
	 * Returns the number of bits needed to store the data length
	 * according to QR Code specifications.
	 *
	 * @param  {Mode}   mode    Data mode
	 * @param  {Number} version QR Code version
	 * @return {Number}         Number of bits
	 */
	exports.getCharCountIndicator = function getCharCountIndicator (mode, version) {
	  if (!mode.ccBits) throw new Error('Invalid mode: ' + mode)

	  if (!VersionCheck.isValid(version)) {
	    throw new Error('Invalid version: ' + version)
	  }

	  if (version >= 1 && version < 10) return mode.ccBits[0]
	  else if (version < 27) return mode.ccBits[1]
	  return mode.ccBits[2]
	};

	/**
	 * Returns the most efficient mode to store the specified data
	 *
	 * @param  {String} dataStr Input data string
	 * @return {Mode}           Best mode
	 */
	exports.getBestModeForData = function getBestModeForData (dataStr) {
	  if (Regex.testNumeric(dataStr)) return exports.NUMERIC
	  else if (Regex.testAlphanumeric(dataStr)) return exports.ALPHANUMERIC
	  else if (Regex.testKanji(dataStr)) return exports.KANJI
	  else return exports.BYTE
	};

	/**
	 * Return mode name as string
	 *
	 * @param {Mode} mode Mode object
	 * @returns {String}  Mode name
	 */
	exports.toString = function toString (mode) {
	  if (mode && mode.id) return mode.id
	  throw new Error('Invalid mode')
	};

	/**
	 * Check if input param is a valid mode object
	 *
	 * @param   {Mode}    mode Mode object
	 * @returns {Boolean} True if valid mode, false otherwise
	 */
	exports.isValid = function isValid (mode) {
	  return mode && mode.bit && mode.ccBits
	};

	/**
	 * Get mode object from its name
	 *
	 * @param   {String} string Mode name
	 * @returns {Mode}          Mode object
	 */
	function fromString (string) {
	  if (typeof string !== 'string') {
	    throw new Error('Param is not a string')
	  }

	  const lcStr = string.toLowerCase();

	  switch (lcStr) {
	    case 'numeric':
	      return exports.NUMERIC
	    case 'alphanumeric':
	      return exports.ALPHANUMERIC
	    case 'kanji':
	      return exports.KANJI
	    case 'byte':
	      return exports.BYTE
	    default:
	      throw new Error('Unknown mode: ' + string)
	  }
	}

	/**
	 * Returns mode from a value.
	 * If value is not a valid mode, returns defaultValue
	 *
	 * @param  {Mode|String} value        Encoding mode
	 * @param  {Mode}        defaultValue Fallback value
	 * @return {Mode}                     Encoding mode
	 */
	exports.from = function from (value, defaultValue) {
	  if (exports.isValid(value)) {
	    return value
	  }

	  try {
	    return fromString(value)
	  } catch (e) {
	    return defaultValue
	  }
	};
} (mode));

(function (exports) {
	const Utils = utils$1;
	const ECCode = errorCorrectionCode;
	const ECLevel = errorCorrectionLevel;
	const Mode = mode;
	const VersionCheck = versionCheck;

	// Generator polynomial used to encode version information
	const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
	const G18_BCH = Utils.getBCHDigit(G18);

	function getBestVersionForDataLength (mode, length, errorCorrectionLevel) {
	  for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
	    if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, mode)) {
	      return currentVersion
	    }
	  }

	  return undefined
	}

	function getReservedBitsCount (mode, version) {
	  // Character count indicator + mode indicator bits
	  return Mode.getCharCountIndicator(mode, version) + 4
	}

	function getTotalBitsFromDataArray (segments, version) {
	  let totalBits = 0;

	  segments.forEach(function (data) {
	    const reservedBits = getReservedBitsCount(data.mode, version);
	    totalBits += reservedBits + data.getBitsLength();
	  });

	  return totalBits
	}

	function getBestVersionForMixedData (segments, errorCorrectionLevel) {
	  for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
	    const length = getTotalBitsFromDataArray(segments, currentVersion);
	    if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED)) {
	      return currentVersion
	    }
	  }

	  return undefined
	}

	/**
	 * Returns version number from a value.
	 * If value is not a valid version, returns defaultValue
	 *
	 * @param  {Number|String} value        QR Code version
	 * @param  {Number}        defaultValue Fallback value
	 * @return {Number}                     QR Code version number
	 */
	exports.from = function from (value, defaultValue) {
	  if (VersionCheck.isValid(value)) {
	    return parseInt(value, 10)
	  }

	  return defaultValue
	};

	/**
	 * Returns how much data can be stored with the specified QR code version
	 * and error correction level
	 *
	 * @param  {Number} version              QR Code version (1-40)
	 * @param  {Number} errorCorrectionLevel Error correction level
	 * @param  {Mode}   mode                 Data mode
	 * @return {Number}                      Quantity of storable data
	 */
	exports.getCapacity = function getCapacity (version, errorCorrectionLevel, mode) {
	  if (!VersionCheck.isValid(version)) {
	    throw new Error('Invalid QR Code version')
	  }

	  // Use Byte mode as default
	  if (typeof mode === 'undefined') mode = Mode.BYTE;

	  // Total codewords for this QR code version (Data + Error correction)
	  const totalCodewords = Utils.getSymbolTotalCodewords(version);

	  // Total number of error correction codewords
	  const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);

	  // Total number of data codewords
	  const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;

	  if (mode === Mode.MIXED) return dataTotalCodewordsBits

	  const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version);

	  // Return max number of storable codewords
	  switch (mode) {
	    case Mode.NUMERIC:
	      return Math.floor((usableBits / 10) * 3)

	    case Mode.ALPHANUMERIC:
	      return Math.floor((usableBits / 11) * 2)

	    case Mode.KANJI:
	      return Math.floor(usableBits / 13)

	    case Mode.BYTE:
	    default:
	      return Math.floor(usableBits / 8)
	  }
	};

	/**
	 * Returns the minimum version needed to contain the amount of data
	 *
	 * @param  {Segment} data                    Segment of data
	 * @param  {Number} [errorCorrectionLevel=H] Error correction level
	 * @param  {Mode} mode                       Data mode
	 * @return {Number}                          QR Code version
	 */
	exports.getBestVersionForData = function getBestVersionForData (data, errorCorrectionLevel) {
	  let seg;

	  const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);

	  if (Array.isArray(data)) {
	    if (data.length > 1) {
	      return getBestVersionForMixedData(data, ecl)
	    }

	    if (data.length === 0) {
	      return 1
	    }

	    seg = data[0];
	  } else {
	    seg = data;
	  }

	  return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl)
	};

	/**
	 * Returns version information with relative error correction bits
	 *
	 * The version information is included in QR Code symbols of version 7 or larger.
	 * It consists of an 18-bit sequence containing 6 data bits,
	 * with 12 error correction bits calculated using the (18, 6) Golay code.
	 *
	 * @param  {Number} version QR Code version
	 * @return {Number}         Encoded version info bits
	 */
	exports.getEncodedBits = function getEncodedBits (version) {
	  if (!VersionCheck.isValid(version) || version < 7) {
	    throw new Error('Invalid QR Code version')
	  }

	  let d = version << 12;

	  while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
	    d ^= (G18 << (Utils.getBCHDigit(d) - G18_BCH));
	  }

	  return (version << 12) | d
	};
} (version$1));

var formatInfo = {};

const Utils$3 = utils$1;

const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);
const G15_BCH = Utils$3.getBCHDigit(G15);

/**
 * Returns format information with relative error correction bits
 *
 * The format information is a 15-bit sequence containing 5 data bits,
 * with 10 error correction bits calculated using the (15, 5) BCH code.
 *
 * @param  {Number} errorCorrectionLevel Error correction level
 * @param  {Number} mask                 Mask pattern
 * @return {Number}                      Encoded format information bits
 */
formatInfo.getEncodedBits = function getEncodedBits (errorCorrectionLevel, mask) {
  const data = ((errorCorrectionLevel.bit << 3) | mask);
  let d = data << 10;

  while (Utils$3.getBCHDigit(d) - G15_BCH >= 0) {
    d ^= (G15 << (Utils$3.getBCHDigit(d) - G15_BCH));
  }

  // xor final data with mask pattern in order to ensure that
  // no combination of Error Correction Level and data mask pattern
  // will result in an all-zero data string
  return ((data << 10) | d) ^ G15_MASK
};

var segments = {};

const Mode$4 = mode;

function NumericData (data) {
  this.mode = Mode$4.NUMERIC;
  this.data = data.toString();
}

NumericData.getBitsLength = function getBitsLength (length) {
  return 10 * Math.floor(length / 3) + ((length % 3) ? ((length % 3) * 3 + 1) : 0)
};

NumericData.prototype.getLength = function getLength () {
  return this.data.length
};

NumericData.prototype.getBitsLength = function getBitsLength () {
  return NumericData.getBitsLength(this.data.length)
};

NumericData.prototype.write = function write (bitBuffer) {
  let i, group, value;

  // The input data string is divided into groups of three digits,
  // and each group is converted to its 10-bit binary equivalent.
  for (i = 0; i + 3 <= this.data.length; i += 3) {
    group = this.data.substr(i, 3);
    value = parseInt(group, 10);

    bitBuffer.put(value, 10);
  }

  // If the number of input digits is not an exact multiple of three,
  // the final one or two digits are converted to 4 or 7 bits respectively.
  const remainingNum = this.data.length - i;
  if (remainingNum > 0) {
    group = this.data.substr(i);
    value = parseInt(group, 10);

    bitBuffer.put(value, remainingNum * 3 + 1);
  }
};

var numericData = NumericData;

const Mode$3 = mode;

/**
 * Array of characters available in alphanumeric mode
 *
 * As per QR Code specification, to each character
 * is assigned a value from 0 to 44 which in this case coincides
 * with the array index
 *
 * @type {Array}
 */
const ALPHA_NUM_CHARS = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  ' ', '$', '%', '*', '+', '-', '.', '/', ':'
];

function AlphanumericData (data) {
  this.mode = Mode$3.ALPHANUMERIC;
  this.data = data;
}

AlphanumericData.getBitsLength = function getBitsLength (length) {
  return 11 * Math.floor(length / 2) + 6 * (length % 2)
};

AlphanumericData.prototype.getLength = function getLength () {
  return this.data.length
};

AlphanumericData.prototype.getBitsLength = function getBitsLength () {
  return AlphanumericData.getBitsLength(this.data.length)
};

AlphanumericData.prototype.write = function write (bitBuffer) {
  let i;

  // Input data characters are divided into groups of two characters
  // and encoded as 11-bit binary codes.
  for (i = 0; i + 2 <= this.data.length; i += 2) {
    // The character value of the first character is multiplied by 45
    let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;

    // The character value of the second digit is added to the product
    value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);

    // The sum is then stored as 11-bit binary number
    bitBuffer.put(value, 11);
  }

  // If the number of input data characters is not a multiple of two,
  // the character value of the final character is encoded as a 6-bit binary number.
  if (this.data.length % 2) {
    bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
  }
};

var alphanumericData = AlphanumericData;

var encodeUtf8$1 = function encodeUtf8 (input) {
  var result = [];
  var size = input.length;

  for (var index = 0; index < size; index++) {
    var point = input.charCodeAt(index);

    if (point >= 0xD800 && point <= 0xDBFF && size > index + 1) {
      var second = input.charCodeAt(index + 1);

      if (second >= 0xDC00 && second <= 0xDFFF) {
        // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        point = (point - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
        index += 1;
      }
    }

    // US-ASCII
    if (point < 0x80) {
      result.push(point);
      continue
    }

    // 2-byte UTF-8
    if (point < 0x800) {
      result.push((point >> 6) | 192);
      result.push((point & 63) | 128);
      continue
    }

    // 3-byte UTF-8
    if (point < 0xD800 || (point >= 0xE000 && point < 0x10000)) {
      result.push((point >> 12) | 224);
      result.push(((point >> 6) & 63) | 128);
      result.push((point & 63) | 128);
      continue
    }

    // 4-byte UTF-8
    if (point >= 0x10000 && point <= 0x10FFFF) {
      result.push((point >> 18) | 240);
      result.push(((point >> 12) & 63) | 128);
      result.push(((point >> 6) & 63) | 128);
      result.push((point & 63) | 128);
      continue
    }

    // Invalid character
    result.push(0xEF, 0xBF, 0xBD);
  }

  return new Uint8Array(result).buffer
};

const encodeUtf8 = encodeUtf8$1;
const Mode$2 = mode;

function ByteData (data) {
  this.mode = Mode$2.BYTE;
  if (typeof (data) === 'string') {
    data = encodeUtf8(data);
  }
  this.data = new Uint8Array(data);
}

ByteData.getBitsLength = function getBitsLength (length) {
  return length * 8
};

ByteData.prototype.getLength = function getLength () {
  return this.data.length
};

ByteData.prototype.getBitsLength = function getBitsLength () {
  return ByteData.getBitsLength(this.data.length)
};

ByteData.prototype.write = function (bitBuffer) {
  for (let i = 0, l = this.data.length; i < l; i++) {
    bitBuffer.put(this.data[i], 8);
  }
};

var byteData = ByteData;

const Mode$1 = mode;
const Utils$2 = utils$1;

function KanjiData (data) {
  this.mode = Mode$1.KANJI;
  this.data = data;
}

KanjiData.getBitsLength = function getBitsLength (length) {
  return length * 13
};

KanjiData.prototype.getLength = function getLength () {
  return this.data.length
};

KanjiData.prototype.getBitsLength = function getBitsLength () {
  return KanjiData.getBitsLength(this.data.length)
};

KanjiData.prototype.write = function (bitBuffer) {
  let i;

  // In the Shift JIS system, Kanji characters are represented by a two byte combination.
  // These byte values are shifted from the JIS X 0208 values.
  // JIS X 0208 gives details of the shift coded representation.
  for (i = 0; i < this.data.length; i++) {
    let value = Utils$2.toSJIS(this.data[i]);

    // For characters with Shift JIS values from 0x8140 to 0x9FFC:
    if (value >= 0x8140 && value <= 0x9FFC) {
      // Subtract 0x8140 from Shift JIS value
      value -= 0x8140;

    // For characters with Shift JIS values from 0xE040 to 0xEBBF
    } else if (value >= 0xE040 && value <= 0xEBBF) {
      // Subtract 0xC140 from Shift JIS value
      value -= 0xC140;
    } else {
      throw new Error(
        'Invalid SJIS character: ' + this.data[i] + '\n' +
        'Make sure your charset is UTF-8')
    }

    // Multiply most significant byte of result by 0xC0
    // and add least significant byte to product
    value = (((value >>> 8) & 0xff) * 0xC0) + (value & 0xff);

    // Convert result to a 13-bit binary string
    bitBuffer.put(value, 13);
  }
};

var kanjiData = KanjiData;

var dijkstra = {exports: {}};

(function (module) {

	/******************************************************************************
	 * Created 2008-08-19.
	 *
	 * Dijkstra path-finding functions. Adapted from the Dijkstar Python project.
	 *
	 * Copyright (C) 2008
	 *   Wyatt Baldwin <self@wyattbaldwin.com>
	 *   All rights reserved
	 *
	 * Licensed under the MIT license.
	 *
	 *   http://www.opensource.org/licenses/mit-license.php
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 *****************************************************************************/
	var dijkstra = {
	  single_source_shortest_paths: function(graph, s, d) {
	    // Predecessor map for each node that has been encountered.
	    // node ID => predecessor node ID
	    var predecessors = {};

	    // Costs of shortest paths from s to all nodes encountered.
	    // node ID => cost
	    var costs = {};
	    costs[s] = 0;

	    // Costs of shortest paths from s to all nodes encountered; differs from
	    // `costs` in that it provides easy access to the node that currently has
	    // the known shortest path from s.
	    // XXX: Do we actually need both `costs` and `open`?
	    var open = dijkstra.PriorityQueue.make();
	    open.push(s, 0);

	    var closest,
	        u, v,
	        cost_of_s_to_u,
	        adjacent_nodes,
	        cost_of_e,
	        cost_of_s_to_u_plus_cost_of_e,
	        cost_of_s_to_v,
	        first_visit;
	    while (!open.empty()) {
	      // In the nodes remaining in graph that have a known cost from s,
	      // find the node, u, that currently has the shortest path from s.
	      closest = open.pop();
	      u = closest.value;
	      cost_of_s_to_u = closest.cost;

	      // Get nodes adjacent to u...
	      adjacent_nodes = graph[u] || {};

	      // ...and explore the edges that connect u to those nodes, updating
	      // the cost of the shortest paths to any or all of those nodes as
	      // necessary. v is the node across the current edge from u.
	      for (v in adjacent_nodes) {
	        if (adjacent_nodes.hasOwnProperty(v)) {
	          // Get the cost of the edge running from u to v.
	          cost_of_e = adjacent_nodes[v];

	          // Cost of s to u plus the cost of u to v across e--this is *a*
	          // cost from s to v that may or may not be less than the current
	          // known cost to v.
	          cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;

	          // If we haven't visited v yet OR if the current known cost from s to
	          // v is greater than the new cost we just found (cost of s to u plus
	          // cost of u to v across e), update v's cost in the cost list and
	          // update v's predecessor in the predecessor list (it's now u).
	          cost_of_s_to_v = costs[v];
	          first_visit = (typeof costs[v] === 'undefined');
	          if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
	            costs[v] = cost_of_s_to_u_plus_cost_of_e;
	            open.push(v, cost_of_s_to_u_plus_cost_of_e);
	            predecessors[v] = u;
	          }
	        }
	      }
	    }

	    if (typeof d !== 'undefined' && typeof costs[d] === 'undefined') {
	      var msg = ['Could not find a path from ', s, ' to ', d, '.'].join('');
	      throw new Error(msg);
	    }

	    return predecessors;
	  },

	  extract_shortest_path_from_predecessor_list: function(predecessors, d) {
	    var nodes = [];
	    var u = d;
	    while (u) {
	      nodes.push(u);
	      predecessors[u];
	      u = predecessors[u];
	    }
	    nodes.reverse();
	    return nodes;
	  },

	  find_path: function(graph, s, d) {
	    var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
	    return dijkstra.extract_shortest_path_from_predecessor_list(
	      predecessors, d);
	  },

	  /**
	   * A very naive priority queue implementation.
	   */
	  PriorityQueue: {
	    make: function (opts) {
	      var T = dijkstra.PriorityQueue,
	          t = {},
	          key;
	      opts = opts || {};
	      for (key in T) {
	        if (T.hasOwnProperty(key)) {
	          t[key] = T[key];
	        }
	      }
	      t.queue = [];
	      t.sorter = opts.sorter || T.default_sorter;
	      return t;
	    },

	    default_sorter: function (a, b) {
	      return a.cost - b.cost;
	    },

	    /**
	     * Add a new item to the queue and ensure the highest priority element
	     * is at the front of the queue.
	     */
	    push: function (value, cost) {
	      var item = {value: value, cost: cost};
	      this.queue.push(item);
	      this.queue.sort(this.sorter);
	    },

	    /**
	     * Return the highest priority element in the queue.
	     */
	    pop: function () {
	      return this.queue.shift();
	    },

	    empty: function () {
	      return this.queue.length === 0;
	    }
	  }
	};


	// node.js module exports
	{
	  module.exports = dijkstra;
	}
} (dijkstra));

(function (exports) {
	const Mode = mode;
	const NumericData = numericData;
	const AlphanumericData = alphanumericData;
	const ByteData = byteData;
	const KanjiData = kanjiData;
	const Regex = regex;
	const Utils = utils$1;
	const dijkstra$1 = dijkstra.exports;

	/**
	 * Returns UTF8 byte length
	 *
	 * @param  {String} str Input string
	 * @return {Number}     Number of byte
	 */
	function getStringByteLength (str) {
	  return unescape(encodeURIComponent(str)).length
	}

	/**
	 * Get a list of segments of the specified mode
	 * from a string
	 *
	 * @param  {Mode}   mode Segment mode
	 * @param  {String} str  String to process
	 * @return {Array}       Array of object with segments data
	 */
	function getSegments (regex, mode, str) {
	  const segments = [];
	  let result;

	  while ((result = regex.exec(str)) !== null) {
	    segments.push({
	      data: result[0],
	      index: result.index,
	      mode: mode,
	      length: result[0].length
	    });
	  }

	  return segments
	}

	/**
	 * Extracts a series of segments with the appropriate
	 * modes from a string
	 *
	 * @param  {String} dataStr Input string
	 * @return {Array}          Array of object with segments data
	 */
	function getSegmentsFromString (dataStr) {
	  const numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr);
	  const alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode.ALPHANUMERIC, dataStr);
	  let byteSegs;
	  let kanjiSegs;

	  if (Utils.isKanjiModeEnabled()) {
	    byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr);
	    kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr);
	  } else {
	    byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr);
	    kanjiSegs = [];
	  }

	  const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs);

	  return segs
	    .sort(function (s1, s2) {
	      return s1.index - s2.index
	    })
	    .map(function (obj) {
	      return {
	        data: obj.data,
	        mode: obj.mode,
	        length: obj.length
	      }
	    })
	}

	/**
	 * Returns how many bits are needed to encode a string of
	 * specified length with the specified mode
	 *
	 * @param  {Number} length String length
	 * @param  {Mode} mode     Segment mode
	 * @return {Number}        Bit length
	 */
	function getSegmentBitsLength (length, mode) {
	  switch (mode) {
	    case Mode.NUMERIC:
	      return NumericData.getBitsLength(length)
	    case Mode.ALPHANUMERIC:
	      return AlphanumericData.getBitsLength(length)
	    case Mode.KANJI:
	      return KanjiData.getBitsLength(length)
	    case Mode.BYTE:
	      return ByteData.getBitsLength(length)
	  }
	}

	/**
	 * Merges adjacent segments which have the same mode
	 *
	 * @param  {Array} segs Array of object with segments data
	 * @return {Array}      Array of object with segments data
	 */
	function mergeSegments (segs) {
	  return segs.reduce(function (acc, curr) {
	    const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
	    if (prevSeg && prevSeg.mode === curr.mode) {
	      acc[acc.length - 1].data += curr.data;
	      return acc
	    }

	    acc.push(curr);
	    return acc
	  }, [])
	}

	/**
	 * Generates a list of all possible nodes combination which
	 * will be used to build a segments graph.
	 *
	 * Nodes are divided by groups. Each group will contain a list of all the modes
	 * in which is possible to encode the given text.
	 *
	 * For example the text '12345' can be encoded as Numeric, Alphanumeric or Byte.
	 * The group for '12345' will contain then 3 objects, one for each
	 * possible encoding mode.
	 *
	 * Each node represents a possible segment.
	 *
	 * @param  {Array} segs Array of object with segments data
	 * @return {Array}      Array of object with segments data
	 */
	function buildNodes (segs) {
	  const nodes = [];
	  for (let i = 0; i < segs.length; i++) {
	    const seg = segs[i];

	    switch (seg.mode) {
	      case Mode.NUMERIC:
	        nodes.push([seg,
	          { data: seg.data, mode: Mode.ALPHANUMERIC, length: seg.length },
	          { data: seg.data, mode: Mode.BYTE, length: seg.length }
	        ]);
	        break
	      case Mode.ALPHANUMERIC:
	        nodes.push([seg,
	          { data: seg.data, mode: Mode.BYTE, length: seg.length }
	        ]);
	        break
	      case Mode.KANJI:
	        nodes.push([seg,
	          { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
	        ]);
	        break
	      case Mode.BYTE:
	        nodes.push([
	          { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
	        ]);
	    }
	  }

	  return nodes
	}

	/**
	 * Builds a graph from a list of nodes.
	 * All segments in each node group will be connected with all the segments of
	 * the next group and so on.
	 *
	 * At each connection will be assigned a weight depending on the
	 * segment's byte length.
	 *
	 * @param  {Array} nodes    Array of object with segments data
	 * @param  {Number} version QR Code version
	 * @return {Object}         Graph of all possible segments
	 */
	function buildGraph (nodes, version) {
	  const table = {};
	  const graph = { start: {} };
	  let prevNodeIds = ['start'];

	  for (let i = 0; i < nodes.length; i++) {
	    const nodeGroup = nodes[i];
	    const currentNodeIds = [];

	    for (let j = 0; j < nodeGroup.length; j++) {
	      const node = nodeGroup[j];
	      const key = '' + i + j;

	      currentNodeIds.push(key);
	      table[key] = { node: node, lastCount: 0 };
	      graph[key] = {};

	      for (let n = 0; n < prevNodeIds.length; n++) {
	        const prevNodeId = prevNodeIds[n];

	        if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
	          graph[prevNodeId][key] =
	            getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) -
	            getSegmentBitsLength(table[prevNodeId].lastCount, node.mode);

	          table[prevNodeId].lastCount += node.length;
	        } else {
	          if (table[prevNodeId]) table[prevNodeId].lastCount = node.length;

	          graph[prevNodeId][key] = getSegmentBitsLength(node.length, node.mode) +
	            4 + Mode.getCharCountIndicator(node.mode, version); // switch cost
	        }
	      }
	    }

	    prevNodeIds = currentNodeIds;
	  }

	  for (let n = 0; n < prevNodeIds.length; n++) {
	    graph[prevNodeIds[n]].end = 0;
	  }

	  return { map: graph, table: table }
	}

	/**
	 * Builds a segment from a specified data and mode.
	 * If a mode is not specified, the more suitable will be used.
	 *
	 * @param  {String} data             Input data
	 * @param  {Mode | String} modesHint Data mode
	 * @return {Segment}                 Segment
	 */
	function buildSingleSegment (data, modesHint) {
	  let mode;
	  const bestMode = Mode.getBestModeForData(data);

	  mode = Mode.from(modesHint, bestMode);

	  // Make sure data can be encoded
	  if (mode !== Mode.BYTE && mode.bit < bestMode.bit) {
	    throw new Error('"' + data + '"' +
	      ' cannot be encoded with mode ' + Mode.toString(mode) +
	      '.\n Suggested mode is: ' + Mode.toString(bestMode))
	  }

	  // Use Mode.BYTE if Kanji support is disabled
	  if (mode === Mode.KANJI && !Utils.isKanjiModeEnabled()) {
	    mode = Mode.BYTE;
	  }

	  switch (mode) {
	    case Mode.NUMERIC:
	      return new NumericData(data)

	    case Mode.ALPHANUMERIC:
	      return new AlphanumericData(data)

	    case Mode.KANJI:
	      return new KanjiData(data)

	    case Mode.BYTE:
	      return new ByteData(data)
	  }
	}

	/**
	 * Builds a list of segments from an array.
	 * Array can contain Strings or Objects with segment's info.
	 *
	 * For each item which is a string, will be generated a segment with the given
	 * string and the more appropriate encoding mode.
	 *
	 * For each item which is an object, will be generated a segment with the given
	 * data and mode.
	 * Objects must contain at least the property "data".
	 * If property "mode" is not present, the more suitable mode will be used.
	 *
	 * @param  {Array} array Array of objects with segments data
	 * @return {Array}       Array of Segments
	 */
	exports.fromArray = function fromArray (array) {
	  return array.reduce(function (acc, seg) {
	    if (typeof seg === 'string') {
	      acc.push(buildSingleSegment(seg, null));
	    } else if (seg.data) {
	      acc.push(buildSingleSegment(seg.data, seg.mode));
	    }

	    return acc
	  }, [])
	};

	/**
	 * Builds an optimized sequence of segments from a string,
	 * which will produce the shortest possible bitstream.
	 *
	 * @param  {String} data    Input string
	 * @param  {Number} version QR Code version
	 * @return {Array}          Array of segments
	 */
	exports.fromString = function fromString (data, version) {
	  const segs = getSegmentsFromString(data, Utils.isKanjiModeEnabled());

	  const nodes = buildNodes(segs);
	  const graph = buildGraph(nodes, version);
	  const path = dijkstra$1.find_path(graph.map, 'start', 'end');

	  const optimizedSegs = [];
	  for (let i = 1; i < path.length - 1; i++) {
	    optimizedSegs.push(graph.table[path[i]].node);
	  }

	  return exports.fromArray(mergeSegments(optimizedSegs))
	};

	/**
	 * Splits a string in various segments with the modes which
	 * best represent their content.
	 * The produced segments are far from being optimized.
	 * The output of this function is only used to estimate a QR Code version
	 * which may contain the data.
	 *
	 * @param  {string} data Input string
	 * @return {Array}       Array of segments
	 */
	exports.rawSplit = function rawSplit (data) {
	  return exports.fromArray(
	    getSegmentsFromString(data, Utils.isKanjiModeEnabled())
	  )
	};
} (segments));

const Utils$1 = utils$1;
const ECLevel = errorCorrectionLevel;
const BitBuffer = bitBuffer;
const BitMatrix = bitMatrix;
const AlignmentPattern = alignmentPattern;
const FinderPattern = finderPattern;
const MaskPattern = maskPattern;
const ECCode = errorCorrectionCode;
const ReedSolomonEncoder = reedSolomonEncoder;
const Version = version$1;
const FormatInfo = formatInfo;
const Mode = mode;
const Segments = segments;

/**
 * QRCode for JavaScript
 *
 * modified by Ryan Day for nodejs support
 * Copyright (c) 2011 Ryan Day
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------
*/

/**
 * Add finder patterns bits to matrix
 *
 * @param  {BitMatrix} matrix  Modules matrix
 * @param  {Number}    version QR Code version
 */
function setupFinderPattern (matrix, version) {
  const size = matrix.size;
  const pos = FinderPattern.getPositions(version);

  for (let i = 0; i < pos.length; i++) {
    const row = pos[i][0];
    const col = pos[i][1];

    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || size <= row + r) continue

      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || size <= col + c) continue

        if ((r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          matrix.set(row + r, col + c, true, true);
        } else {
          matrix.set(row + r, col + c, false, true);
        }
      }
    }
  }
}

/**
 * Add timing pattern bits to matrix
 *
 * Note: this function must be called before {@link setupAlignmentPattern}
 *
 * @param  {BitMatrix} matrix Modules matrix
 */
function setupTimingPattern (matrix) {
  const size = matrix.size;

  for (let r = 8; r < size - 8; r++) {
    const value = r % 2 === 0;
    matrix.set(r, 6, value, true);
    matrix.set(6, r, value, true);
  }
}

/**
 * Add alignment patterns bits to matrix
 *
 * Note: this function must be called after {@link setupTimingPattern}
 *
 * @param  {BitMatrix} matrix  Modules matrix
 * @param  {Number}    version QR Code version
 */
function setupAlignmentPattern (matrix, version) {
  const pos = AlignmentPattern.getPositions(version);

  for (let i = 0; i < pos.length; i++) {
    const row = pos[i][0];
    const col = pos[i][1];

    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        if (r === -2 || r === 2 || c === -2 || c === 2 ||
          (r === 0 && c === 0)) {
          matrix.set(row + r, col + c, true, true);
        } else {
          matrix.set(row + r, col + c, false, true);
        }
      }
    }
  }
}

/**
 * Add version info bits to matrix
 *
 * @param  {BitMatrix} matrix  Modules matrix
 * @param  {Number}    version QR Code version
 */
function setupVersionInfo (matrix, version) {
  const size = matrix.size;
  const bits = Version.getEncodedBits(version);
  let row, col, mod;

  for (let i = 0; i < 18; i++) {
    row = Math.floor(i / 3);
    col = i % 3 + size - 8 - 3;
    mod = ((bits >> i) & 1) === 1;

    matrix.set(row, col, mod, true);
    matrix.set(col, row, mod, true);
  }
}

/**
 * Add format info bits to matrix
 *
 * @param  {BitMatrix} matrix               Modules matrix
 * @param  {ErrorCorrectionLevel}    errorCorrectionLevel Error correction level
 * @param  {Number}    maskPattern          Mask pattern reference value
 */
function setupFormatInfo (matrix, errorCorrectionLevel, maskPattern) {
  const size = matrix.size;
  const bits = FormatInfo.getEncodedBits(errorCorrectionLevel, maskPattern);
  let i, mod;

  for (i = 0; i < 15; i++) {
    mod = ((bits >> i) & 1) === 1;

    // vertical
    if (i < 6) {
      matrix.set(i, 8, mod, true);
    } else if (i < 8) {
      matrix.set(i + 1, 8, mod, true);
    } else {
      matrix.set(size - 15 + i, 8, mod, true);
    }

    // horizontal
    if (i < 8) {
      matrix.set(8, size - i - 1, mod, true);
    } else if (i < 9) {
      matrix.set(8, 15 - i - 1 + 1, mod, true);
    } else {
      matrix.set(8, 15 - i - 1, mod, true);
    }
  }

  // fixed module
  matrix.set(size - 8, 8, 1, true);
}

/**
 * Add encoded data bits to matrix
 *
 * @param  {BitMatrix}  matrix Modules matrix
 * @param  {Uint8Array} data   Data codewords
 */
function setupData (matrix, data) {
  const size = matrix.size;
  let inc = -1;
  let row = size - 1;
  let bitIndex = 7;
  let byteIndex = 0;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;

    while (true) {
      for (let c = 0; c < 2; c++) {
        if (!matrix.isReserved(row, col - c)) {
          let dark = false;

          if (byteIndex < data.length) {
            dark = (((data[byteIndex] >>> bitIndex) & 1) === 1);
          }

          matrix.set(row, col - c, dark);
          bitIndex--;

          if (bitIndex === -1) {
            byteIndex++;
            bitIndex = 7;
          }
        }
      }

      row += inc;

      if (row < 0 || size <= row) {
        row -= inc;
        inc = -inc;
        break
      }
    }
  }
}

/**
 * Create encoded codewords from data input
 *
 * @param  {Number}   version              QR Code version
 * @param  {ErrorCorrectionLevel}   errorCorrectionLevel Error correction level
 * @param  {ByteData} data                 Data input
 * @return {Uint8Array}                    Buffer containing encoded codewords
 */
function createData (version, errorCorrectionLevel, segments) {
  // Prepare data buffer
  const buffer = new BitBuffer();

  segments.forEach(function (data) {
    // prefix data with mode indicator (4 bits)
    buffer.put(data.mode.bit, 4);

    // Prefix data with character count indicator.
    // The character count indicator is a string of bits that represents the
    // number of characters that are being encoded.
    // The character count indicator must be placed after the mode indicator
    // and must be a certain number of bits long, depending on the QR version
    // and data mode
    // @see {@link Mode.getCharCountIndicator}.
    buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version));

    // add binary data sequence to buffer
    data.write(buffer);
  });

  // Calculate required number of bits
  const totalCodewords = Utils$1.getSymbolTotalCodewords(version);
  const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
  const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;

  // Add a terminator.
  // If the bit string is shorter than the total number of required bits,
  // a terminator of up to four 0s must be added to the right side of the string.
  // If the bit string is more than four bits shorter than the required number of bits,
  // add four 0s to the end.
  if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
    buffer.put(0, 4);
  }

  // If the bit string is fewer than four bits shorter, add only the number of 0s that
  // are needed to reach the required number of bits.

  // After adding the terminator, if the number of bits in the string is not a multiple of 8,
  // pad the string on the right with 0s to make the string's length a multiple of 8.
  while (buffer.getLengthInBits() % 8 !== 0) {
    buffer.putBit(0);
  }

  // Add pad bytes if the string is still shorter than the total number of required bits.
  // Extend the buffer to fill the data capacity of the symbol corresponding to
  // the Version and Error Correction Level by adding the Pad Codewords 11101100 (0xEC)
  // and 00010001 (0x11) alternately.
  const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
  for (let i = 0; i < remainingByte; i++) {
    buffer.put(i % 2 ? 0x11 : 0xEC, 8);
  }

  return createCodewords(buffer, version, errorCorrectionLevel)
}

/**
 * Encode input data with Reed-Solomon and return codewords with
 * relative error correction bits
 *
 * @param  {BitBuffer} bitBuffer            Data to encode
 * @param  {Number}    version              QR Code version
 * @param  {ErrorCorrectionLevel} errorCorrectionLevel Error correction level
 * @return {Uint8Array}                     Buffer containing encoded codewords
 */
function createCodewords (bitBuffer, version, errorCorrectionLevel) {
  // Total codewords for this QR code version (Data + Error correction)
  const totalCodewords = Utils$1.getSymbolTotalCodewords(version);

  // Total number of error correction codewords
  const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);

  // Total number of data codewords
  const dataTotalCodewords = totalCodewords - ecTotalCodewords;

  // Total number of blocks
  const ecTotalBlocks = ECCode.getBlocksCount(version, errorCorrectionLevel);

  // Calculate how many blocks each group should contain
  const blocksInGroup2 = totalCodewords % ecTotalBlocks;
  const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;

  const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);

  const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
  const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;

  // Number of EC codewords is the same for both groups
  const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;

  // Initialize a Reed-Solomon encoder with a generator polynomial of degree ecCount
  const rs = new ReedSolomonEncoder(ecCount);

  let offset = 0;
  const dcData = new Array(ecTotalBlocks);
  const ecData = new Array(ecTotalBlocks);
  let maxDataSize = 0;
  const buffer = new Uint8Array(bitBuffer.buffer);

  // Divide the buffer into the required number of blocks
  for (let b = 0; b < ecTotalBlocks; b++) {
    const dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;

    // extract a block of data from buffer
    dcData[b] = buffer.slice(offset, offset + dataSize);

    // Calculate EC codewords for this data block
    ecData[b] = rs.encode(dcData[b]);

    offset += dataSize;
    maxDataSize = Math.max(maxDataSize, dataSize);
  }

  // Create final data
  // Interleave the data and error correction codewords from each block
  const data = new Uint8Array(totalCodewords);
  let index = 0;
  let i, r;

  // Add data codewords
  for (i = 0; i < maxDataSize; i++) {
    for (r = 0; r < ecTotalBlocks; r++) {
      if (i < dcData[r].length) {
        data[index++] = dcData[r][i];
      }
    }
  }

  // Apped EC codewords
  for (i = 0; i < ecCount; i++) {
    for (r = 0; r < ecTotalBlocks; r++) {
      data[index++] = ecData[r][i];
    }
  }

  return data
}

/**
 * Build QR Code symbol
 *
 * @param  {String} data                 Input string
 * @param  {Number} version              QR Code version
 * @param  {ErrorCorretionLevel} errorCorrectionLevel Error level
 * @param  {MaskPattern} maskPattern     Mask pattern
 * @return {Object}                      Object containing symbol data
 */
function createSymbol (data, version, errorCorrectionLevel, maskPattern) {
  let segments;

  if (Array.isArray(data)) {
    segments = Segments.fromArray(data);
  } else if (typeof data === 'string') {
    let estimatedVersion = version;

    if (!estimatedVersion) {
      const rawSegments = Segments.rawSplit(data);

      // Estimate best version that can contain raw splitted segments
      estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel);
    }

    // Build optimized segments
    // If estimated version is undefined, try with the highest version
    segments = Segments.fromString(data, estimatedVersion || 40);
  } else {
    throw new Error('Invalid data')
  }

  // Get the min version that can contain data
  const bestVersion = Version.getBestVersionForData(segments, errorCorrectionLevel);

  // If no version is found, data cannot be stored
  if (!bestVersion) {
    throw new Error('The amount of data is too big to be stored in a QR Code')
  }

  // If not specified, use min version as default
  if (!version) {
    version = bestVersion;

  // Check if the specified version can contain the data
  } else if (version < bestVersion) {
    throw new Error('\n' +
      'The chosen QR Code version cannot contain this amount of data.\n' +
      'Minimum version required to store current data is: ' + bestVersion + '.\n'
    )
  }

  const dataBits = createData(version, errorCorrectionLevel, segments);

  // Allocate matrix buffer
  const moduleCount = Utils$1.getSymbolSize(version);
  const modules = new BitMatrix(moduleCount);

  // Add function modules
  setupFinderPattern(modules, version);
  setupTimingPattern(modules);
  setupAlignmentPattern(modules, version);

  // Add temporary dummy bits for format info just to set them as reserved.
  // This is needed to prevent these bits from being masked by {@link MaskPattern.applyMask}
  // since the masking operation must be performed only on the encoding region.
  // These blocks will be replaced with correct values later in code.
  setupFormatInfo(modules, errorCorrectionLevel, 0);

  if (version >= 7) {
    setupVersionInfo(modules, version);
  }

  // Add data codewords
  setupData(modules, dataBits);

  if (isNaN(maskPattern)) {
    // Find best mask pattern
    maskPattern = MaskPattern.getBestMask(modules,
      setupFormatInfo.bind(null, modules, errorCorrectionLevel));
  }

  // Apply mask pattern
  MaskPattern.applyMask(maskPattern, modules);

  // Replace format info bits with correct values
  setupFormatInfo(modules, errorCorrectionLevel, maskPattern);

  return {
    modules: modules,
    version: version,
    errorCorrectionLevel: errorCorrectionLevel,
    maskPattern: maskPattern,
    segments: segments
  }
}

/**
 * QR Code
 *
 * @param {String | Array} data                 Input data
 * @param {Object} options                      Optional configurations
 * @param {Number} options.version              QR Code version
 * @param {String} options.errorCorrectionLevel Error correction level
 * @param {Function} options.toSJISFunc         Helper func to convert utf8 to sjis
 */
qrcode.create = function create (data, options) {
  if (typeof data === 'undefined' || data === '') {
    throw new Error('No input text')
  }

  let errorCorrectionLevel = ECLevel.M;
  let version;
  let mask;

  if (typeof options !== 'undefined') {
    // Use higher error correction level as default
    errorCorrectionLevel = ECLevel.from(options.errorCorrectionLevel, ECLevel.M);
    version = Version.from(options.version);
    mask = MaskPattern.from(options.maskPattern);

    if (options.toSJISFunc) {
      Utils$1.setToSJISFunction(options.toSJISFunc);
    }
  }

  return createSymbol(data, version, errorCorrectionLevel, mask)
};

var canvas = {};

var utils = {};

(function (exports) {
	function hex2rgba (hex) {
	  if (typeof hex === 'number') {
	    hex = hex.toString();
	  }

	  if (typeof hex !== 'string') {
	    throw new Error('Color should be defined as hex string')
	  }

	  let hexCode = hex.slice().replace('#', '').split('');
	  if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) {
	    throw new Error('Invalid hex color: ' + hex)
	  }

	  // Convert from short to long form (fff -> ffffff)
	  if (hexCode.length === 3 || hexCode.length === 4) {
	    hexCode = Array.prototype.concat.apply([], hexCode.map(function (c) {
	      return [c, c]
	    }));
	  }

	  // Add default alpha value
	  if (hexCode.length === 6) hexCode.push('F', 'F');

	  const hexValue = parseInt(hexCode.join(''), 16);

	  return {
	    r: (hexValue >> 24) & 255,
	    g: (hexValue >> 16) & 255,
	    b: (hexValue >> 8) & 255,
	    a: hexValue & 255,
	    hex: '#' + hexCode.slice(0, 6).join('')
	  }
	}

	exports.getOptions = function getOptions (options) {
	  if (!options) options = {};
	  if (!options.color) options.color = {};

	  const margin = typeof options.margin === 'undefined' ||
	    options.margin === null ||
	    options.margin < 0
	    ? 4
	    : options.margin;

	  const width = options.width && options.width >= 21 ? options.width : undefined;
	  const scale = options.scale || 4;

	  return {
	    width: width,
	    scale: width ? 4 : scale,
	    margin: margin,
	    color: {
	      dark: hex2rgba(options.color.dark || '#000000ff'),
	      light: hex2rgba(options.color.light || '#ffffffff')
	    },
	    type: options.type,
	    rendererOpts: options.rendererOpts || {}
	  }
	};

	exports.getScale = function getScale (qrSize, opts) {
	  return opts.width && opts.width >= qrSize + opts.margin * 2
	    ? opts.width / (qrSize + opts.margin * 2)
	    : opts.scale
	};

	exports.getImageWidth = function getImageWidth (qrSize, opts) {
	  const scale = exports.getScale(qrSize, opts);
	  return Math.floor((qrSize + opts.margin * 2) * scale)
	};

	exports.qrToImageData = function qrToImageData (imgData, qr, opts) {
	  const size = qr.modules.size;
	  const data = qr.modules.data;
	  const scale = exports.getScale(size, opts);
	  const symbolSize = Math.floor((size + opts.margin * 2) * scale);
	  const scaledMargin = opts.margin * scale;
	  const palette = [opts.color.light, opts.color.dark];

	  for (let i = 0; i < symbolSize; i++) {
	    for (let j = 0; j < symbolSize; j++) {
	      let posDst = (i * symbolSize + j) * 4;
	      let pxColor = opts.color.light;

	      if (i >= scaledMargin && j >= scaledMargin &&
	        i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
	        const iSrc = Math.floor((i - scaledMargin) / scale);
	        const jSrc = Math.floor((j - scaledMargin) / scale);
	        pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
	      }

	      imgData[posDst++] = pxColor.r;
	      imgData[posDst++] = pxColor.g;
	      imgData[posDst++] = pxColor.b;
	      imgData[posDst] = pxColor.a;
	    }
	  }
	};
} (utils));

(function (exports) {
	const Utils = utils;

	function clearCanvas (ctx, canvas, size) {
	  ctx.clearRect(0, 0, canvas.width, canvas.height);

	  if (!canvas.style) canvas.style = {};
	  canvas.height = size;
	  canvas.width = size;
	  canvas.style.height = size + 'px';
	  canvas.style.width = size + 'px';
	}

	function getCanvasElement () {
	  try {
	    return document.createElement('canvas')
	  } catch (e) {
	    throw new Error('You need to specify a canvas element')
	  }
	}

	exports.render = function render (qrData, canvas, options) {
	  let opts = options;
	  let canvasEl = canvas;

	  if (typeof opts === 'undefined' && (!canvas || !canvas.getContext)) {
	    opts = canvas;
	    canvas = undefined;
	  }

	  if (!canvas) {
	    canvasEl = getCanvasElement();
	  }

	  opts = Utils.getOptions(opts);
	  const size = Utils.getImageWidth(qrData.modules.size, opts);

	  const ctx = canvasEl.getContext('2d');
	  const image = ctx.createImageData(size, size);
	  Utils.qrToImageData(image.data, qrData, opts);

	  clearCanvas(ctx, canvasEl, size);
	  ctx.putImageData(image, 0, 0);

	  return canvasEl
	};

	exports.renderToDataURL = function renderToDataURL (qrData, canvas, options) {
	  let opts = options;

	  if (typeof opts === 'undefined' && (!canvas || !canvas.getContext)) {
	    opts = canvas;
	    canvas = undefined;
	  }

	  if (!opts) opts = {};

	  const canvasEl = exports.render(qrData, canvas, opts);

	  const type = opts.type || 'image/png';
	  const rendererOpts = opts.rendererOpts || {};

	  return canvasEl.toDataURL(type, rendererOpts.quality)
	};
} (canvas));

var svgTag = {};

const Utils = utils;

function getColorAttrib (color, attrib) {
  const alpha = color.a / 255;
  const str = attrib + '="' + color.hex + '"';

  return alpha < 1
    ? str + ' ' + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"'
    : str
}

function svgCmd (cmd, x, y) {
  let str = cmd + x;
  if (typeof y !== 'undefined') str += ' ' + y;

  return str
}

function qrToPath (data, size, margin) {
  let path = '';
  let moveBy = 0;
  let newRow = false;
  let lineLength = 0;

  for (let i = 0; i < data.length; i++) {
    const col = Math.floor(i % size);
    const row = Math.floor(i / size);

    if (!col && !newRow) newRow = true;

    if (data[i]) {
      lineLength++;

      if (!(i > 0 && col > 0 && data[i - 1])) {
        path += newRow
          ? svgCmd('M', col + margin, 0.5 + row + margin)
          : svgCmd('m', moveBy, 0);

        moveBy = 0;
        newRow = false;
      }

      if (!(col + 1 < size && data[i + 1])) {
        path += svgCmd('h', lineLength);
        lineLength = 0;
      }
    } else {
      moveBy++;
    }
  }

  return path
}

svgTag.render = function render (qrData, options, cb) {
  const opts = Utils.getOptions(options);
  const size = qrData.modules.size;
  const data = qrData.modules.data;
  const qrcodesize = size + opts.margin * 2;

  const bg = !opts.color.light.a
    ? ''
    : '<path ' + getColorAttrib(opts.color.light, 'fill') +
      ' d="M0 0h' + qrcodesize + 'v' + qrcodesize + 'H0z"/>';

  const path =
    '<path ' + getColorAttrib(opts.color.dark, 'stroke') +
    ' d="' + qrToPath(data, size, opts.margin) + '"/>';

  const viewBox = 'viewBox="' + '0 0 ' + qrcodesize + ' ' + qrcodesize + '"';

  const width = !opts.width ? '' : 'width="' + opts.width + '" height="' + opts.width + '" ';

  const svgTag = '<svg xmlns="http://www.w3.org/2000/svg" ' + width + viewBox + ' shape-rendering="crispEdges">' + bg + path + '</svg>\n';

  if (typeof cb === 'function') {
    cb(null, svgTag);
  }

  return svgTag
};

const canPromise = canPromise$1;

const QRCode = qrcode;
const CanvasRenderer = canvas;
const SvgRenderer = svgTag;

function renderCanvas (renderFunc, canvas, text, opts, cb) {
  const args = [].slice.call(arguments, 1);
  const argsNum = args.length;
  const isLastArgCb = typeof args[argsNum - 1] === 'function';

  if (!isLastArgCb && !canPromise()) {
    throw new Error('Callback required as last argument')
  }

  if (isLastArgCb) {
    if (argsNum < 2) {
      throw new Error('Too few arguments provided')
    }

    if (argsNum === 2) {
      cb = text;
      text = canvas;
      canvas = opts = undefined;
    } else if (argsNum === 3) {
      if (canvas.getContext && typeof cb === 'undefined') {
        cb = opts;
        opts = undefined;
      } else {
        cb = opts;
        opts = text;
        text = canvas;
        canvas = undefined;
      }
    }
  } else {
    if (argsNum < 1) {
      throw new Error('Too few arguments provided')
    }

    if (argsNum === 1) {
      text = canvas;
      canvas = opts = undefined;
    } else if (argsNum === 2 && !canvas.getContext) {
      opts = text;
      text = canvas;
      canvas = undefined;
    }

    return new Promise(function (resolve, reject) {
      try {
        const data = QRCode.create(text, opts);
        resolve(renderFunc(data, canvas, opts));
      } catch (e) {
        reject(e);
      }
    })
  }

  try {
    const data = QRCode.create(text, opts);
    cb(null, renderFunc(data, canvas, opts));
  } catch (e) {
    cb(e);
  }
}

var create = QRCode.create;
var toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
renderCanvas.bind(null, CanvasRenderer.renderToDataURL);

// only svg for now.
renderCanvas.bind(null, function (data, _, opts) {
  return SvgRenderer.render(data, opts)
});

var dist$2 = {};

var global$1 = (typeof global !== "undefined" ? global :
  typeof self !== "undefined" ? self :
  typeof window !== "undefined" ? window : {});

var lookup = [];
var revLookup = [];
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
var inited = false;
function init () {
  inited = true;
  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i];
    revLookup[code.charCodeAt(i)] = i;
  }

  revLookup['-'.charCodeAt(0)] = 62;
  revLookup['_'.charCodeAt(0)] = 63;
}

function toByteArray (b64) {
  if (!inited) {
    init();
  }
  var i, j, l, tmp, placeHolders, arr;
  var len = b64.length;

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;

  // base64 is 4/3 + up to two characters of the original data
  arr = new Arr(len * 3 / 4 - placeHolders);

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len;

  var L = 0;

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)];
    arr[L++] = (tmp >> 16) & 0xFF;
    arr[L++] = (tmp >> 8) & 0xFF;
    arr[L++] = tmp & 0xFF;
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
    arr[L++] = tmp & 0xFF;
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2);
    arr[L++] = (tmp >> 8) & 0xFF;
    arr[L++] = tmp & 0xFF;
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp;
  var output = [];
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
    output.push(tripletToBase64(tmp));
  }
  return output.join('')
}

function fromByteArray (uint8) {
  if (!inited) {
    init();
  }
  var tmp;
  var len = uint8.length;
  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
  var output = '';
  var parts = [];
  var maxChunkLength = 16383; // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1];
    output += lookup[tmp >> 2];
    output += lookup[(tmp << 4) & 0x3F];
    output += '==';
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1]);
    output += lookup[tmp >> 10];
    output += lookup[(tmp >> 4) & 0x3F];
    output += lookup[(tmp << 2) & 0x3F];
    output += '=';
  }

  parts.push(output);

  return parts.join('')
}

function read (buffer, offset, isLE, mLen, nBytes) {
  var e, m;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = -7;
  var i = isLE ? (nBytes - 1) : 0;
  var d = isLE ? -1 : 1;
  var s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

function write (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
  var i = isLE ? 0 : (nBytes - 1);
  var d = isLE ? 1 : -1;
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128;
}

var toString = {}.toString;

var isArray = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var INSPECT_MAX_BYTES = 50;

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined
  ? global$1.TYPED_ARRAY_SUPPORT
  : true;

/*
 * Export kMaxLength after typed array support is determined.
 */
var _kMaxLength = kMaxLength();

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length);
    that.__proto__ = Buffer.prototype;
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length);
    }
    that.length = length;
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192; // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype;
  return arr
};

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
};

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype;
  Buffer.__proto__ = Uint8Array;
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size);
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
};

function allocUnsafe (that, size) {
  assertSize(size);
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0;
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
};
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
};

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8';
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0;
  that = createBuffer(that, length);

  var actual = that.write(string, encoding);

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual);
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0;
  that = createBuffer(that, length);
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255;
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength; // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array);
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset);
  } else {
    array = new Uint8Array(array, byteOffset, length);
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array;
    that.__proto__ = Buffer.prototype;
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array);
  }
  return that
}

function fromObject (that, obj) {
  if (internalIsBuffer(obj)) {
    var len = checked(obj.length) | 0;
    that = createBuffer(that, len);

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len);
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0;
  }
  return Buffer.alloc(+length)
}
Buffer.isBuffer = isBuffer;
function internalIsBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length;
  var y = b.length;

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
};

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
};

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i;
  if (length === undefined) {
    length = 0;
    for (i = 0; i < list.length; ++i) {
      length += list[i].length;
    }
  }

  var buffer = Buffer.allocUnsafe(length);
  var pos = 0;
  for (i = 0; i < list.length; ++i) {
    var buf = list[i];
    if (!internalIsBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer
};

function byteLength (string, encoding) {
  if (internalIsBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string;
  }

  var len = string.length;
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
}
Buffer.byteLength = byteLength;

function slowToString (encoding, start, end) {
  var loweredCase = false;

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0;
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length;
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0;
  start >>>= 0;

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8';

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase();
        loweredCase = true;
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true;

function swap (b, n, m) {
  var i = b[n];
  b[n] = b[m];
  b[m] = i;
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length;
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1);
  }
  return this
};

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length;
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3);
    swap(this, i + 1, i + 2);
  }
  return this
};

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length;
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7);
    swap(this, i + 1, i + 6);
    swap(this, i + 2, i + 5);
    swap(this, i + 3, i + 4);
  }
  return this
};

Buffer.prototype.toString = function toString () {
  var length = this.length | 0;
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
};

Buffer.prototype.equals = function equals (b) {
  if (!internalIsBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
};

Buffer.prototype.inspect = function inspect () {
  var str = '';
  var max = INSPECT_MAX_BYTES;
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
    if (this.length > max) str += ' ... ';
  }
  return '<Buffer ' + str + '>'
};

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!internalIsBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0;
  }
  if (end === undefined) {
    end = target ? target.length : 0;
  }
  if (thisStart === undefined) {
    thisStart = 0;
  }
  if (thisEnd === undefined) {
    thisEnd = this.length;
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0;
  end >>>= 0;
  thisStart >>>= 0;
  thisEnd >>>= 0;

  if (this === target) return 0

  var x = thisEnd - thisStart;
  var y = end - start;
  var len = Math.min(x, y);

  var thisCopy = this.slice(thisStart, thisEnd);
  var targetCopy = target.slice(start, end);

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i];
      y = targetCopy[i];
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
};

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset;
    byteOffset = 0;
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff;
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000;
  }
  byteOffset = +byteOffset;  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1);
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1;
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0;
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding);
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (internalIsBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF; // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1;
  var arrLength = arr.length;
  var valLength = val.length;

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase();
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2;
      arrLength /= 2;
      valLength /= 2;
      byteOffset /= 2;
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i;
  if (dir) {
    var foundIndex = -1;
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i;
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex;
        foundIndex = -1;
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
    for (i = byteOffset; i >= 0; i--) {
      var found = true;
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false;
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
};

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
};

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
};

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0;
  var remaining = buf.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = Number(length);
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed;
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8';
    length = this.length;
    offset = 0;
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset;
    length = this.length;
    offset = 0;
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0;
    if (isFinite(length)) {
      length = length | 0;
      if (encoding === undefined) encoding = 'utf8';
    } else {
      encoding = length;
      length = undefined;
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset;
  if (length === undefined || length > remaining) length = remaining;

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8';

  var loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
};

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
};

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return fromByteArray(buf)
  } else {
    return fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end);
  var res = [];

  var i = start;
  while (i < end) {
    var firstByte = buf[i];
    var codePoint = null;
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1;

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint;

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte;
          }
          break
        case 2:
          secondByte = buf[i + 1];
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint;
            }
          }
          break
        case 3:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint;
            }
          }
          break
        case 4:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          fourthByte = buf[i + 3];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint;
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD;
      bytesPerSequence = 1;
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000;
      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
      codePoint = 0xDC00 | codePoint & 0x3FF;
    }

    res.push(codePoint);
    i += bytesPerSequence;
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000;

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length;
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = '';
  var i = 0;
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    );
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = '';
  end = Math.min(buf.length, end);

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F);
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = '';
  end = Math.min(buf.length, end);

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i]);
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i]);
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end);
  var res = '';
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length;
  start = ~~start;
  end = end === undefined ? len : ~~end;

  if (start < 0) {
    start += len;
    if (start < 0) start = 0;
  } else if (start > len) {
    start = len;
  }

  if (end < 0) {
    end += len;
    if (end < 0) end = 0;
  } else if (end > len) {
    end = len;
  }

  if (end < start) end = start;

  var newBuf;
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end);
    newBuf.__proto__ = Buffer.prototype;
  } else {
    var sliceLen = end - start;
    newBuf = new Buffer(sliceLen, undefined);
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start];
    }
  }

  return newBuf
};

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }

  return val
};

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length);
  }

  var val = this[offset + --byteLength];
  var mul = 1;
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul;
  }

  return val
};

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length);
  return this[offset]
};

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  return this[offset] | (this[offset + 1] << 8)
};

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  return (this[offset] << 8) | this[offset + 1]
};

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
};

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
};

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val
};

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var i = byteLength;
  var mul = 1;
  var val = this[offset + --i];
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val
};

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length);
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
};

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  var val = this[offset] | (this[offset + 1] << 8);
  return (val & 0x8000) ? val | 0xFFFF0000 : val
};

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  var val = this[offset + 1] | (this[offset] << 8);
  return (val & 0x8000) ? val | 0xFFFF0000 : val
};

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
};

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
};

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);
  return read(this, offset, true, 23, 4)
};

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);
  return read(this, offset, false, 23, 4)
};

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length);
  return read(this, offset, true, 52, 8)
};

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length);
  return read(this, offset, false, 52, 8)
};

function checkInt (buf, value, offset, ext, max, min) {
  if (!internalIsBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  var mul = 1;
  var i = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  var i = byteLength - 1;
  var mul = 1;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
  this[offset] = (value & 0xff);
  return offset + 1
};

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1;
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8;
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
  } else {
    objectWriteUInt16(this, value, offset, true);
  }
  return offset + 2
};

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8);
    this[offset + 1] = (value & 0xff);
  } else {
    objectWriteUInt16(this, value, offset, false);
  }
  return offset + 2
};

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1;
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24);
    this[offset + 2] = (value >>> 16);
    this[offset + 1] = (value >>> 8);
    this[offset] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, true);
  }
  return offset + 4
};

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24);
    this[offset + 1] = (value >>> 16);
    this[offset + 2] = (value >>> 8);
    this[offset + 3] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, false);
  }
  return offset + 4
};

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  var i = 0;
  var mul = 1;
  var sub = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  var i = byteLength - 1;
  var mul = 1;
  var sub = 0;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
  if (value < 0) value = 0xff + value + 1;
  this[offset] = (value & 0xff);
  return offset + 1
};

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
  } else {
    objectWriteUInt16(this, value, offset, true);
  }
  return offset + 2
};

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8);
    this[offset + 1] = (value & 0xff);
  } else {
    objectWriteUInt16(this, value, offset, false);
  }
  return offset + 2
};

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
    this[offset + 2] = (value >>> 16);
    this[offset + 3] = (value >>> 24);
  } else {
    objectWriteUInt32(this, value, offset, true);
  }
  return offset + 4
};

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  if (value < 0) value = 0xffffffff + value + 1;
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24);
    this[offset + 1] = (value >>> 16);
    this[offset + 2] = (value >>> 8);
    this[offset + 3] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, false);
  }
  return offset + 4
};

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4);
  }
  write(buf, value, offset, littleEndian, 23, 4);
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
};

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
};

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8);
  }
  write(buf, value, offset, littleEndian, 52, 8);
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
};

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0;
  if (!end && end !== 0) end = this.length;
  if (targetStart >= target.length) targetStart = target.length;
  if (!targetStart) targetStart = 0;
  if (end > 0 && end < start) end = start;

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length;
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start;
  }

  var len = end - start;
  var i;

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start];
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start];
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    );
  }

  return len
};

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start;
      start = 0;
      end = this.length;
    } else if (typeof end === 'string') {
      encoding = end;
      end = this.length;
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0);
      if (code < 256) {
        val = code;
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255;
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0;
  end = end === undefined ? this.length : end >>> 0;

  if (!val) val = 0;

  var i;
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val;
    }
  } else {
    var bytes = internalIsBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString());
    var len = bytes.length;
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len];
    }
  }

  return this
};

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '');
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '=';
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity;
  var codePoint;
  var length = string.length;
  var leadSurrogate = null;
  var bytes = [];

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i);

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue
        }

        // valid lead
        leadSurrogate = codePoint;

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
        leadSurrogate = codePoint;
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
    }

    leadSurrogate = null;

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      );
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF);
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo;
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i);
    hi = c >> 8;
    lo = c % 256;
    byteArray.push(lo);
    byteArray.push(hi);
  }

  return byteArray
}


function base64ToBytes (str) {
  return toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i];
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}


// the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
function isBuffer(obj) {
  return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj))
}

function isFastBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0))
}

var bufferEs6 = /*#__PURE__*/Object.freeze({
	__proto__: null,
	Buffer: Buffer,
	INSPECT_MAX_BYTES: INSPECT_MAX_BYTES,
	SlowBuffer: SlowBuffer,
	isBuffer: isBuffer,
	kMaxLength: _kMaxLength
});

var __createBinding$3 = (undefined && undefined.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault$3 = (undefined && undefined.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar$3 = (undefined && undefined.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding$3(result, mod, k);
    __setModuleDefault$3(result, mod);
    return result;
};
var __importDefault$e = (undefined && undefined.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TonhubConnector = void 0;
const ton_crypto_1$5 = require("ton-crypto");
const backoff_1 = require("../utils/backoff");
const toURLsafe_1 = require("../utils/toURLsafe");
const t$3 = __importStar$3(require("io-ts"));
const teslabot_1 = require("teslabot");
const ton_1$4 = require("ton");
const bn_js_1$9 = __importDefault$e(require("bn.js"));
const TonhubHttpTransport_1 = require("../transport/TonhubHttpTransport");
const extractPublicKeyAndAddress_1$2 = require("../contracts/extractPublicKeyAndAddress");
const crypto_1 = require("./crypto");
const sessionStateCodec = t$3.union([
    t$3.type({
        state: t$3.literal('not_found')
    }),
    t$3.type({
        state: t$3.literal('initing'),
        name: t$3.string,
        url: t$3.string,
        testnet: t$3.boolean,
        created: t$3.number,
        updated: t$3.number,
        revoked: t$3.boolean
    }),
    t$3.type({
        state: t$3.literal('ready'),
        name: t$3.string,
        url: t$3.string,
        wallet: t$3.type({
            address: t$3.string,
            endpoint: t$3.string,
            walletConfig: t$3.string,
            walletType: t$3.string,
            walletSig: t$3.string,
            appPublicKey: t$3.string
        }),
        testnet: t$3.boolean,
        created: t$3.number,
        updated: t$3.number,
        revoked: t$3.boolean
    })
]);
const jobStateCodec = t$3.union([t$3.type({
        state: t$3.union([t$3.literal('submitted'), t$3.literal('expired'), t$3.literal('rejected')]),
        job: t$3.string,
        created: t$3.number,
        updated: t$3.number,
        now: t$3.number
    }), t$3.type({
        state: t$3.literal('completed'),
        job: t$3.string,
        created: t$3.number,
        updated: t$3.number,
        result: t$3.string,
        now: t$3.number
    }), t$3.type({
        state: t$3.literal('empty'),
        now: t$3.number
    })]);
function idFromSeed(seed) {
    let keyPair = (0, ton_crypto_1$5.keyPairFromSeed)(Buffer.from(seed, 'base64'));
    return (0, toURLsafe_1.toUrlSafe)(keyPair.publicKey.toString('base64'));
}
function textToCell(src) {
    let bytes = Buffer.from(src);
    let res = new ton_1$4.Cell();
    let dest = res;
    while (bytes.length > 0) {
        let avaliable = Math.floor(dest.bits.available / 8);
        if (bytes.length <= avaliable) {
            dest.bits.writeBuffer(bytes);
            break;
        }
        dest.bits.writeBuffer(bytes.slice(0, avaliable));
        bytes = bytes.slice(avaliable, bytes.length);
        let nc = new ton_1$4.Cell();
        dest.refs.push(nc);
        dest = nc;
    }
    return res;
}
class TonhubConnector {
    constructor(args) {
        this.createNewSession = async (args) => {
            // Generate new key
            let seed = await (0, ton_crypto_1$5.getSecureRandomBytes)(32);
            let keyPair = (0, ton_crypto_1$5.keyPairFromSeed)(seed);
            let sessionId = (0, toURLsafe_1.toUrlSafe)(keyPair.publicKey.toString('base64'));
            // Request new session
            await (0, backoff_1.backoff)(async () => {
                let session = await this.transport.call('session_new', {
                    key: sessionId,
                    testnet: this.network === 'sandbox',
                    name: args.name,
                    url: args.url,
                });
                if (!session.ok) {
                    throw Error('Unable to create state');
                }
            });
            // Return session
            return {
                id: sessionId,
                seed: seed.toString('base64'),
                link: (this.network === 'sandbox' ? 'ton-test://connect/' : 'ton://connect/') + sessionId + '?endpoint=connect.tonhubapi.com'
            };
        };
        this.ensureSessionStateCorrect = (sessionId, ex) => {
            if (!sessionStateCodec.is(ex)) {
                throw Error('Invalid response from server');
            }
            if (ex.state === 'initing') {
                if (ex.testnet !== (this.network === 'sandbox')) {
                    return { state: 'revoked' };
                }
                return {
                    state: 'initing',
                    name: ex.name,
                    url: ex.url,
                    created: ex.created,
                    updated: ex.updated
                };
            }
            if (ex.state === 'ready') {
                if (ex.revoked) {
                    return { state: 'revoked' };
                }
                if (ex.testnet !== (this.network === 'sandbox')) {
                    return { state: 'revoked' };
                }
                if (!TonhubConnector.verifyWalletConfig(sessionId, ex.wallet)) {
                    throw Error('Integrity check failed');
                }
                return {
                    state: 'ready',
                    name: ex.name,
                    url: ex.url,
                    created: ex.created,
                    updated: ex.updated,
                    wallet: {
                        address: ex.wallet.address,
                        endpoint: ex.wallet.endpoint,
                        walletType: ex.wallet.walletType,
                        walletConfig: ex.wallet.walletConfig,
                        walletSig: ex.wallet.walletSig,
                        appPublicKey: ex.wallet.appPublicKey
                    }
                };
            }
            return { state: 'revoked' };
        };
        this.getSessionState = async (sessionId) => {
            return await (0, backoff_1.backoff)(async () => {
                let session = await this.transport.call('session_get', {
                    id: sessionId
                });
                return this.ensureSessionStateCorrect(sessionId, session);
            });
        };
        this.waitForSessionState = async (sessionId, lastUpdated) => {
            return await (0, backoff_1.backoff)(async () => {
                let session = await this.transport.call('session_wait', {
                    id: sessionId,
                    lastUpdated
                });
                return this.ensureSessionStateCorrect(sessionId, session);
            });
        };
        this.awaitSessionReady = async (sessionId, timeout, lastUpdated) => {
            let expires = Date.now() + timeout;
            let res = await (0, backoff_1.backoff)(async () => {
                while (Date.now() < expires) {
                    let existing = await this.waitForSessionState(sessionId, lastUpdated);
                    if (existing.state !== 'initing') {
                        if (existing.state === 'ready') {
                            return existing;
                        }
                        else if (existing.state === 'revoked') {
                            return existing;
                        }
                    }
                    await (0, teslabot_1.delay)(1000);
                }
                return { state: 'expired' };
            });
            return res;
        };
        this.requestTransaction = async (request) => {
            const sessionId = idFromSeed(request.seed);
            // Check session
            let session = await (0, backoff_1.backoff)(() => this.getSessionState(sessionId));
            if (session.state !== 'ready') {
                return { type: 'invalid_session' };
            }
            if (session.wallet.appPublicKey !== request.appPublicKey) {
                return { type: 'invalid_session' };
            }
            // Parse address
            let address = ton_1$4.Address.parseFriendly(request.to).address;
            // Value
            let value = new bn_js_1$9.default(request.value, 10);
            // Parse data
            let data = null;
            if (typeof request.payload === 'string') {
                data = ton_1$4.Cell.fromBoc(Buffer.from(request.payload, 'base64'))[0];
            }
            // StateInit
            let stateInit = null;
            if (typeof request.stateInit === 'string') {
                stateInit = ton_1$4.Cell.fromBoc(Buffer.from(request.stateInit, 'base64'))[0];
            }
            // Comment
            let comment = '';
            if (typeof request.text === 'string') {
                comment = request.text;
            }
            // Prepare cell
            let expires = Math.floor((Date.now() + request.timeout) / 1000);
            const job = (0, ton_1$4.beginCell)()
                .storeBuffer(Buffer.from(session.wallet.appPublicKey, 'base64'))
                .storeUint(expires, 32)
                .storeCoins(0)
                .storeRef((0, ton_1$4.beginCell)()
                .storeAddress(address)
                .storeCoins(value)
                .storeRef(textToCell(comment))
                .storeRefMaybe(data ? data : null)
                .storeRefMaybe(stateInit ? stateInit : null)
                .endCell())
                .endCell();
            // Sign
            let keypair = (0, ton_crypto_1$5.keyPairFromSeed)(Buffer.from(request.seed, 'base64'));
            let signature = (0, ton_1$4.safeSign)(job, keypair.secretKey);
            // Create package
            let pkg = (0, ton_1$4.beginCell)()
                .storeBuffer(signature)
                .storeBuffer(keypair.publicKey)
                .storeRef(job)
                .endCell();
            let boc = pkg.toBoc({ idx: false }).toString('base64');
            // Post command
            await (0, backoff_1.backoff)(() => this.transport.call('command_new', {
                job: boc,
            }));
            // Await result
            let result = await this._awaitJobState(request.appPublicKey, boc);
            if (result.type === 'completed') {
                return { type: 'success', response: result.result };
            }
            else if (result.type === 'rejected') {
                return { type: 'rejected' };
            }
            return { type: 'expired' };
        };
        this.requestSign = async (request) => {
            const sessionId = idFromSeed(request.seed);
            // Check session
            let session = await (0, backoff_1.backoff)(() => this.getSessionState(sessionId));
            if (session.state !== 'ready') {
                return { type: 'invalid_session' };
            }
            if (session.wallet.appPublicKey !== request.appPublicKey) {
                return { type: 'invalid_session' };
            }
            // Parse data
            let data = new ton_1$4.Cell();
            if (typeof request.payload === 'string') {
                data = ton_1$4.Cell.fromBoc(Buffer.from(request.payload, 'base64'))[0];
            }
            // Comment
            let comment = '';
            if (typeof request.text === 'string') {
                comment = request.text;
            }
            // Prepare cell
            let expires = Math.floor((Date.now() + request.timeout) / 1000);
            let commentCell = new ton_1$4.Cell();
            new ton_1$4.CommentMessage(comment).writeTo(commentCell);
            const job = (0, ton_1$4.beginCell)()
                .storeBuffer(Buffer.from(session.wallet.appPublicKey, 'base64'))
                .storeUint(expires, 32)
                .storeCoins(1)
                .storeRef((0, ton_1$4.beginCell)()
                .storeRef(commentCell)
                .storeRef(data)
                .endCell())
                .endCell();
            // Sign
            let keypair = (0, ton_crypto_1$5.keyPairFromSeed)(Buffer.from(request.seed, 'base64'));
            let signature = (0, ton_1$4.safeSign)(job, keypair.secretKey);
            // Create package
            let pkg = (0, ton_1$4.beginCell)()
                .storeBuffer(signature)
                .storeBuffer(keypair.publicKey)
                .storeRef(job)
                .endCell();
            let boc = pkg.toBoc({ idx: false }).toString('base64');
            // Post command
            await (0, backoff_1.backoff)(() => this.transport.call('command_new', {
                job: boc,
            }));
            // Await result
            let result = await this._awaitJobState(request.appPublicKey, boc);
            if (result.type === 'completed') {
                const cellRes = ton_1$4.Cell.fromBoc(Buffer.from(result.result, 'base64'))[0];
                let slice = cellRes.beginParse();
                const resSignature = slice.readBuffer(64);
                let correct = (0, crypto_1.verifySignatureResponse)({
                    signature: resSignature.toString('base64'),
                    config: session.wallet,
                    payload: request.payload,
                    text: request.text,
                });
                if (correct) {
                    return { type: 'success', signature: resSignature.toString('base64') };
                }
                else {
                    return { type: 'rejected' };
                }
            }
            else if (result.type === 'rejected') {
                return { type: 'rejected' };
            }
            return { type: 'expired' };
        };
        this._awaitJobState = async (appPublicKey, boc) => {
            return await (0, backoff_1.backoff)(async () => {
                while (true) {
                    let state = await this._getJobState(appPublicKey, boc);
                    if (state.type === 'expired') {
                        return { type: 'expired' };
                    }
                    if (state.type === 'completed') {
                        return { type: 'completed', result: state.result };
                    }
                    if (state.type === 'rejected') {
                        return { type: 'rejected' };
                    }
                    await (0, teslabot_1.delay)(1000);
                }
            });
        };
        this._getJobState = async (appPublicKey, boc) => {
            let appk = (0, toURLsafe_1.toUrlSafe)(appPublicKey);
            let res = await this.transport.call('command_get', { appk });
            if (!jobStateCodec.is(res)) {
                throw Error('Invalid response from server');
            }
            if (res.state === 'empty') {
                return { type: 'expired' };
            }
            if (res.job !== boc) {
                return { type: 'rejected' };
            }
            if (res.state === 'expired') {
                return { type: 'expired' };
            }
            if (res.state === 'submitted') {
                return { type: 'submitted' };
            }
            if (res.state === 'rejected') {
                return { type: 'rejected' };
            }
            if (res.state === 'completed') {
                return { type: 'completed', result: res.result };
            }
            throw Error('Invalid response from server');
        };
        let network = 'mainnet';
        if (args) {
            if (args.network !== undefined) {
                network = args.network;
            }
        }
        this.network = network;
        this.transport = (args === null || args === void 0 ? void 0 : args.transport) || new TonhubHttpTransport_1.TonhubHttpTransport();
    }
    static verifyWalletConfig(session, config) {
        // Check address
        const address = ton_1$4.Address.parseFriendly(config.address).address;
        // Extract public key and address
        let extracted = (0, extractPublicKeyAndAddress_1$2.extractPublicKeyAndAddress)(config);
        if (!extracted) {
            return false;
        }
        // Check address
        if (!extracted.address.equals(address)) {
            return false;
        }
        let publicKey = extracted.publicKey;
        // Check signature
        let toSign = (0, ton_1$4.beginCell)()
            .storeCoins(0)
            .storeBuffer(Buffer.from(session, 'base64'))
            .storeAddress(address)
            // Endpoint
            .storeBit(1)
            .storeRef((0, ton_1$4.beginCell)()
            .storeBuffer(Buffer.from(config.endpoint))
            .endCell())
            // App Public Key
            .storeRef((0, ton_1$4.beginCell)()
            .storeBuffer(Buffer.from(config.appPublicKey, 'base64'))
            .endCell())
            .endCell();
        // Sign
        return (0, ton_1$4.safeSignVerify)(toSign, Buffer.from(config.walletSig, 'base64'), publicKey);
    }
}
exports.TonhubConnector = TonhubConnector;

var TonhubConnector$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$0$5 = /*@__PURE__*/getAugmentedNamespace(TonhubConnector$1);

var __createBinding$2 = (undefined && undefined.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault$2 = (undefined && undefined.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar$2 = (undefined && undefined.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding$2(result, mod, k);
    __setModuleDefault$2(result, mod);
    return result;
};
var __classPrivateFieldSet$4 = (undefined && undefined.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet$5 = (undefined && undefined.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _TonhubLocalConnector_instances, _TonhubLocalConnector_provider, _TonhubLocalConnector_doRequest;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TonhubLocalConnector = void 0;
const t$2 = __importStar$2(require("io-ts"));
const ton_1$3 = require("ton");
const extractPublicKeyAndAddress_1$1 = require("../contracts/extractPublicKeyAndAddress");
const configCodec = t$2.type({
    version: t$2.literal(1),
    platform: t$2.union([t$2.literal('ios'), t$2.literal('android')]),
    platformVersion: t$2.union([t$2.string, t$2.number]),
    network: t$2.union([t$2.literal('sandbox'), t$2.literal('mainnet')]),
    address: t$2.string,
    publicKey: t$2.string,
    walletConfig: t$2.string,
    walletType: t$2.string,
    signature: t$2.string,
    time: t$2.number,
    subkey: t$2.type({
        domain: t$2.string,
        publicKey: t$2.string,
        time: t$2.number,
        signature: t$2.string
    })
});
class TonhubLocalConnector {
    constructor(network) {
        _TonhubLocalConnector_instances.add(this);
        _TonhubLocalConnector_provider.set(this, void 0);
        if (typeof window === 'undefined') {
            throw Error('Not running in browser');
        }
        if (!(window['ton-x'])) {
            throw Error('Not running in dApp browser');
        }
        let tx = (window['ton-x']);
        if (tx.__IS_TON_X !== true) {
            throw Error('Not running in dApp browser');
        }
        let cfg = tx.config;
        if (!configCodec.is(cfg)) {
            throw Error('Not running in dApp browser');
        }
        if (cfg.network !== network) {
            throw Error('Invalid network');
        }
        this.network = network;
        this.config = {
            version: cfg.version,
            network: cfg.network,
            address: cfg.address,
            publicKey: cfg.publicKey,
            walletConfig: cfg.walletConfig,
            walletType: cfg.walletType,
            signature: cfg.signature,
            time: cfg.time,
            subkey: {
                domain: cfg.subkey.domain,
                publicKey: cfg.subkey.publicKey,
                time: cfg.subkey.time,
                signature: cfg.subkey.signature
            }
        };
        __classPrivateFieldSet$4(this, _TonhubLocalConnector_provider, tx.call, "f");
        Object.freeze(this.config.subkey);
        Object.freeze(this.config);
        Object.freeze(this);
    }
    static verifyWalletConfig(config) {
        // Check address
        const address = ton_1$3.Address.parseFriendly(config.address).address;
        // Extract public key and address
        let extracted = (0, extractPublicKeyAndAddress_1$1.extractPublicKeyAndAddress)(config);
        if (!extracted) {
            return false;
        }
        // Check address
        if (!extracted.address.equals(address)) {
            return false;
        }
        // Verify subkey
        const toSignSub = (0, ton_1$3.beginCell)()
            .storeCoins(1)
            .storeBuffer(Buffer.from(config.subkey.publicKey, 'base64'))
            .storeUint(config.subkey.time, 32)
            .storeAddress(extracted.address)
            .storeRef((0, ton_1$3.beginCell)()
            .storeBuffer(Buffer.from(config.subkey.domain))
            .endCell())
            .endCell();
        if (!(0, ton_1$3.safeSignVerify)(toSignSub, Buffer.from(config.subkey.signature, 'base64'), extracted.publicKey)) {
            return false;
        }
        // Verify wallet
        const toSign = (0, ton_1$3.beginCell)()
            .storeCoins(1)
            .storeAddress(extracted.address)
            .storeUint(config.time, 32)
            .storeRef((0, ton_1$3.beginCell)()
            .storeBuffer(Buffer.from(config.subkey.domain))
            .endCell())
            .endCell();
        // Check signature
        return (0, ton_1$3.safeSignVerify)(toSign, Buffer.from(config.signature, 'base64'), Buffer.from(config.subkey.publicKey, 'base64'));
    }
    static isAvailable() {
        if (typeof window === 'undefined') {
            return false;
        }
        if (!(window['ton-x'])) {
            return false;
        }
        let tx = (window['ton-x']);
        if (tx.__IS_TON_X !== true) {
            return false;
        }
        if (!configCodec.is(tx.config)) {
            return false;
        }
        return true;
    }
    async requestTransaction(request) {
        let res = await __classPrivateFieldGet$5(this, _TonhubLocalConnector_instances, "m", _TonhubLocalConnector_doRequest).call(this, 'tx', {
            network: this.network,
            to: request.to,
            value: request.value,
            stateInit: request.stateInit ? request.stateInit : null,
            text: request.text ? request.text : null,
            payload: request.payload ? request.payload : null,
        });
        if (res.type === 'ok') {
            let d = res.data;
            if (d.state === 'rejected') {
                return { type: 'rejected' };
            }
            if (d.state === 'sent') {
                return { type: 'success', response: d.result };
            }
            throw Error('Unknown reponse');
        }
        throw Error(res.message);
    }
    async requestSign(request) {
        // Parse data
        let data = new ton_1$3.Cell();
        if (typeof request.payload === 'string') {
            data = ton_1$3.Cell.fromBoc(Buffer.from(request.payload, 'base64'))[0];
        }
        // Comment
        let comment = '';
        if (typeof request.text === 'string') {
            comment = request.text;
        }
        let commentCell = new ton_1$3.Cell();
        new ton_1$3.CommentMessage(comment).writeTo(commentCell);
        let res = await __classPrivateFieldGet$5(this, _TonhubLocalConnector_instances, "m", _TonhubLocalConnector_doRequest).call(this, 'sign', {
            network: this.network,
            textCell: commentCell.toBoc({ idx: false }).toString('base64'),
            payloadCell: data.toBoc({ idx: false }).toString('base64')
        });
        if (res.type === 'ok') {
            let d = res.data;
            if (d.state === 'rejected') {
                return { type: 'rejected' };
            }
            if (d.state === 'sent') {
                return { type: 'success', signature: d.result };
            }
            throw Error('Unknown reponse');
        }
        throw Error(res.message);
    }
}
exports.TonhubLocalConnector = TonhubLocalConnector;
_TonhubLocalConnector_provider = new WeakMap(), _TonhubLocalConnector_instances = new WeakSet(), _TonhubLocalConnector_doRequest = async function _TonhubLocalConnector_doRequest(name, args) {
    return await new Promise((resolve) => __classPrivateFieldGet$5(this, _TonhubLocalConnector_provider, "f").call(this, name, args, resolve));
};

var TonhubLocalConnector$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$1$4 = /*@__PURE__*/getAugmentedNamespace(TonhubLocalConnector$1);

Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySignatureResponse = void 0;
const ton_1$2 = require("ton");
const extractPublicKeyAndAddress_1 = require("../contracts/extractPublicKeyAndAddress");
function verifySignatureResponse(args) {
    // Check address
    const address = ton_1$2.Address.parseFriendly(args.config.address).address;
    // Extract public key and address
    let extracted = (0, extractPublicKeyAndAddress_1.extractPublicKeyAndAddress)(args.config);
    if (!extracted) {
        return false;
    }
    // Check address
    if (!extracted.address.equals(address)) {
        return false;
    }
    let publicKey = extracted.publicKey;
    // Package
    let textCell = new ton_1$2.Cell();
    let payloadCell = new ton_1$2.Cell();
    if (typeof args.text === 'string') {
        new ton_1$2.CommentMessage(args.text).writeTo(textCell);
    }
    if (typeof args.payload === 'string') {
        payloadCell = ton_1$2.Cell.fromBoc(Buffer.from(args.payload, 'base64'))[0];
    }
    // Check signature
    const data = (0, ton_1$2.beginCell)()
        .storeRef(textCell)
        .storeRef(payloadCell)
        .endCell();
    const signed = (0, ton_1$2.safeSignVerify)(data, Buffer.from(args.signature, 'base64'), publicKey);
    return signed;
}
exports.verifySignatureResponse = verifySignatureResponse;

var crypto$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$2$2 = /*@__PURE__*/getAugmentedNamespace(crypto$1);

var extractPublicKeyAndAddress$1 = {};

var dist$1 = {};

var __classPrivateFieldSet$3 = (undefined && undefined.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet$4 = (undefined && undefined.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault$d = (undefined && undefined.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _BitString_instances, _BitString_length, _BitString_cursor, _BitString_buffer, _BitString_checkRange, _a$3, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitString = void 0;
const bn_js_1$8 = __importDefault$d(require("bn.js"));
const symbol_inspect_1$3 = __importDefault$d(require("symbol.inspect"));
const __1$6 = require("..");
class BitString {
    constructor(buffer, length, cursor) {
        _BitString_instances.add(this);
        _BitString_length.set(this, void 0);
        _BitString_cursor.set(this, void 0);
        _BitString_buffer.set(this, void 0);
        this[_a$3] = () => {
            let offset = 0;
            let end = __classPrivateFieldGet$4(this, _BitString_cursor, "f");
            return {
                next: () => {
                    if (offset < end) {
                        let v = this.get(offset);
                        offset++;
                        return {
                            done: false,
                            value: v
                        };
                    }
                    else {
                        return {
                            done: true
                        };
                    }
                }
            };
        };
        this.get = (n) => {
            __classPrivateFieldGet$4(this, _BitString_instances, "m", _BitString_checkRange).call(this, n);
            return (__classPrivateFieldGet$4(this, _BitString_buffer, "f")[(n / 8) | 0] & (1 << (7 - (n % 8)))) > 0;
        };
        this.on = (n) => {
            __classPrivateFieldGet$4(this, _BitString_instances, "m", _BitString_checkRange).call(this, n);
            __classPrivateFieldGet$4(this, _BitString_buffer, "f")[(n / 8) | 0] |= 1 << (7 - (n % 8));
        };
        this.off = (n) => {
            __classPrivateFieldGet$4(this, _BitString_instances, "m", _BitString_checkRange).call(this, n);
            __classPrivateFieldGet$4(this, _BitString_buffer, "f")[(n / 8) | 0] &= ~(1 << (7 - (n % 8)));
        };
        this.toggle = (n) => {
            __classPrivateFieldGet$4(this, _BitString_instances, "m", _BitString_checkRange).call(this, n);
            __classPrivateFieldGet$4(this, _BitString_buffer, "f")[(n / 8) | 0] ^= 1 << (7 - (n % 8));
        };
        this.writeBit = (value) => {
            var _c;
            if (value === true || value > 0) {
                this.on(__classPrivateFieldGet$4(this, _BitString_cursor, "f"));
            }
            else {
                this.off(__classPrivateFieldGet$4(this, _BitString_cursor, "f"));
            }
            __classPrivateFieldSet$3(this, _BitString_cursor, (_c = __classPrivateFieldGet$4(this, _BitString_cursor, "f"), _c++, _c), "f");
        };
        this.writeUint = (value, bitLength) => {
            let v = new bn_js_1$8.default(value);
            if (bitLength == 0 || (value.toString(2).length > bitLength)) {
                if (v.isZero()) {
                    return;
                }
                throw Error(`bitLength is too small for a value ${v.toString()}. Got ${bitLength}, expected >= ${value.toString(2).length}`);
            }
            const s = v.toString(2, bitLength);
            for (let i = 0; i < bitLength; i++) {
                this.writeBit(s[i] === '1');
            }
        };
        this.writeInt = (value, bitLength) => {
            let v = new bn_js_1$8.default(value);
            if (bitLength == 1) {
                if (v.eq(new bn_js_1$8.default(-1))) {
                    this.writeBit(true);
                    return;
                }
                if (v.isZero()) {
                    this.writeBit(false);
                    return;
                }
                throw Error(`bitlength is too small for a value ${v}`);
            }
            else {
                if (v.isNeg()) {
                    this.writeBit(true);
                    const b = new bn_js_1$8.default(2);
                    const nb = b.pow(new bn_js_1$8.default(bitLength - 1));
                    this.writeUint(nb.add(v), bitLength - 1);
                }
                else {
                    this.writeBit(false);
                    this.writeUint(v, bitLength - 1);
                }
            }
        };
        this.writeUint8 = (value) => {
            this.writeUint(value, 8);
        };
        this.writeBuffer = (buffer) => {
            for (let i = 0; i < buffer.length; i++) {
                this.writeUint8(buffer[i]);
            }
        };
        this.writeCoins = (amount) => {
            if (amount == 0) {
                this.writeUint(0, 4);
            }
            else {
                amount = new bn_js_1$8.default(amount);
                const l = Math.ceil((amount.toString(16).length) / 2);
                this.writeUint(l, 4);
                this.writeUint(amount, l * 8);
            }
        };
        this.writeAddress = (address) => {
            if (address === null) {
                this.writeUint(0, 2);
            }
            else {
                this.writeUint(2, 2);
                this.writeUint(0, 1);
                this.writeInt(address.workChain, 8);
                this.writeBuffer(address.hash);
            }
        };
        this.writeBitString = (value) => {
            for (let v of value) {
                this.writeBit(v);
            }
        };
        this[_b] = () => this.toFiftHex();
        __classPrivateFieldSet$3(this, _BitString_buffer, buffer, "f");
        __classPrivateFieldSet$3(this, _BitString_length, length, "f");
        __classPrivateFieldSet$3(this, _BitString_cursor, cursor, "f");
    }
    static alloc(length) {
        return new BitString(Buffer.alloc(Math.ceil(length / 8), 0), length, 0);
    }
    get available() {
        return this.length - this.cursor;
    }
    get length() {
        return __classPrivateFieldGet$4(this, _BitString_length, "f");
    }
    get cursor() {
        return __classPrivateFieldGet$4(this, _BitString_cursor, "f");
    }
    get buffer() {
        return __classPrivateFieldGet$4(this, _BitString_buffer, "f");
    }
    writeBitArray(value) {
        for (let v of value) {
            this.writeBit(v);
        }
    }
    clone() {
        let buf = Buffer.alloc(__classPrivateFieldGet$4(this, _BitString_buffer, "f").length);
        __classPrivateFieldGet$4(this, _BitString_buffer, "f").copy(buf);
        return new BitString(buf, __classPrivateFieldGet$4(this, _BitString_length, "f"), __classPrivateFieldGet$4(this, _BitString_cursor, "f"));
    }
    toString() {
        let res = '';
        for (let v of this) {
            if (v) {
                res = res + '1';
            }
            else {
                res = res + '0';
            }
        }
        return res;
    }
    toFiftHex() {
        if (this.cursor % 4 === 0) {
            const s = __classPrivateFieldGet$4(this, _BitString_buffer, "f").slice(0, Math.ceil(this.cursor / 8)).toString('hex').toUpperCase();
            if (this.cursor % 8 === 0) {
                return s;
            }
            else {
                return s.substr(0, s.length - 1);
            }
        }
        else {
            const temp = this.clone();
            temp.writeBit(1);
            while (temp.cursor % 4 !== 0) {
                temp.writeBit(0);
            }
            const hex = temp.toFiftHex().toUpperCase();
            return hex + '_';
        }
    }
    setTopUppedArray(array, fullfilledBytes = true) {
        __classPrivateFieldSet$3(this, _BitString_length, array.length * 8, "f");
        __classPrivateFieldSet$3(this, _BitString_buffer, Buffer.alloc(array.length), "f");
        array.copy(__classPrivateFieldGet$4(this, _BitString_buffer, "f"));
        __classPrivateFieldSet$3(this, _BitString_cursor, this.length, "f");
        if (fullfilledBytes || !this.length) {
            return;
        }
        else {
            let foundEndBit = false;
            for (let c = 0; c < 7; c++) {
                __classPrivateFieldSet$3(this, _BitString_cursor, __classPrivateFieldGet$4(this, _BitString_cursor, "f") - 1, "f");
                if (this.get(this.cursor)) {
                    foundEndBit = true;
                    this.off(this.cursor);
                    break;
                }
            }
            if (!foundEndBit) {
                throw new Error("Incorrect TopUppedArray");
            }
        }
    }
    getTopUppedArray() {
        const ret = this.clone();
        let tu = Math.ceil(ret.cursor / 8) * 8 - ret.cursor;
        if (tu > 0) {
            tu = tu - 1;
            ret.writeBit(true);
            while (tu > 0) {
                tu = tu - 1;
                ret.writeBit(false);
            }
        }
        __classPrivateFieldSet$3(ret, _BitString_buffer, __classPrivateFieldGet$4(ret, _BitString_buffer, "f").slice(0, Math.ceil(ret.cursor / 8)), "f");
        return __classPrivateFieldGet$4(ret, _BitString_buffer, "f");
    }
    equals(src) {
        if (src.cursor !== this.cursor) {
            return false;
        }
        if (src.length !== this.length) {
            return false;
        }
        let sr = new __1$6.BitStringReader(src);
        let tr = new __1$6.BitStringReader(this);
        for (let i = 0; i < src.cursor; i++) {
            if (sr.readBit() !== tr.readBit()) {
                return false;
            }
        }
        return true;
    }
}
exports.BitString = BitString;
_BitString_length = new WeakMap(), _BitString_cursor = new WeakMap(), _BitString_buffer = new WeakMap(), _BitString_instances = new WeakSet(), _a$3 = Symbol.iterator, _b = symbol_inspect_1$3.default, _BitString_checkRange = function _BitString_checkRange(n) {
    if (n > this.length) {
        throw Error('Invalid index: ' + n);
    }
};

var BitString$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$0$4 = /*@__PURE__*/getAugmentedNamespace(BitString$1);

Object.defineProperty(exports, "__esModule", { value: true });
exports.BitStringReader = void 0;
const bn_js_1$7 = require("bn.js");
const __1$5 = require("..");
class BitStringReader {
    constructor(string) {
        this.offset = 0;
        let r = Buffer.alloc(string.buffer.length);
        string.buffer.copy(r);
        this.buffer = r;
        this.length = string.cursor;
    }
    get currentOffset() {
        return this.offset;
    }
    get remaining() {
        return this.length - this.offset;
    }
    skip(bits) {
        for (let i = 0; i < bits; i++) {
            this.readBit();
        }
    }
    readUint(bits) {
        if (bits == 0) {
            return new bn_js_1$7.BN(0);
        }
        let res = '';
        for (let i = 0; i < bits; i++) {
            res += this.readBit() ? '1' : '0';
        }
        return new bn_js_1$7.BN(res, 2);
    }
    readUintNumber(bits) {
        return this.readUint(bits).toNumber();
    }
    readInt(bits) {
        if (bits === 0) {
            return new bn_js_1$7.BN(0);
        }
        if (bits === 1) {
            if (this.readBit() /* isNegative */) {
                return new bn_js_1$7.BN(-1);
            }
            else {
                return new bn_js_1$7.BN(0);
            }
        }
        if (this.readBit() /* isNegative */) {
            let base = this.readUint(bits - 1);
            const b = new bn_js_1$7.BN(2);
            const nb = b.pow(new bn_js_1$7.BN(bits - 1));
            return base.sub(nb);
        }
        else {
            return this.readUint(bits - 1);
        }
    }
    readIntNumber(bits) {
        return this.readInt(bits).toNumber();
    }
    readBuffer(size) {
        let res = [];
        for (let i = 0; i < size; i++) {
            res.push(this.readUintNumber(8));
        }
        return Buffer.from(res);
    }
    readBit() {
        let r = this.getBit(this.offset);
        this.offset++;
        return r;
    }
    readCoins() {
        let bytes = this.readUintNumber(4);
        if (bytes === 0) {
            return new bn_js_1$7.BN(0);
        }
        return new bn_js_1$7.BN(this.readBuffer(bytes).toString('hex'), 'hex');
    }
    readVarUInt(headerBits) {
        let bytes = this.readUintNumber(headerBits);
        if (bytes === 0) {
            return new bn_js_1$7.BN(0);
        }
        return new bn_js_1$7.BN(this.readBuffer(bytes).toString('hex'), 'hex');
    }
    readVarUIntNumber(headerBits) {
        return this.readVarUInt(headerBits).toNumber();
    }
    readUnaryLength() {
        let res = 0;
        while (this.readBit()) {
            res++;
        }
        return res;
    }
    readRemaining() {
        let res = __1$5.BitString.alloc(1023);
        while (this.offset < this.length) {
            res.writeBit(this.readBit());
        }
        return res;
    }
    readAddress() {
        let type = this.readUintNumber(2);
        if (type === 0) {
            return null;
        }
        if (type !== 2) {
            throw Error('Only STD address supported');
        }
        if (this.readUintNumber(1) !== 0) {
            throw Error('Only STD address supported');
        }
        const wc = this.readIntNumber(8);
        const hash = this.readBuffer(32);
        return new __1$5.Address(wc, hash);
    }
    getBit(n) {
        if (n >= this.length || n < 0) {
            throw Error('Out of range');
        }
        return (this.buffer[(n / 8) | 0] & (1 << (7 - (n % 8)))) > 0;
    }
}
exports.BitStringReader = BitStringReader;

var BitStringReader$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$1$3 = /*@__PURE__*/getAugmentedNamespace(BitStringReader$1);

var __importDefault$c = (undefined && undefined.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a$2;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cell = void 0;
const BitString_1$1 = require("./BitString");
const boc_1 = require("./boc");
const symbol_inspect_1$2 = __importDefault$c(require("symbol.inspect"));
const __1$4 = require("..");
class Cell {
    constructor(isExotic = false, bits = BitString_1$1.BitString.alloc(1023)) {
        this.refs = [];
        this[_a$2] = () => this.toString();
        this.isExotic = isExotic;
        this.bits = bits;
    }
    static fromBoc(src) {
        return (0, boc_1.deserializeBoc)(typeof src === 'string' ? Buffer.from(src, 'hex') : src);
    }
    beginParse() {
        return __1$4.Slice.fromCell(this);
    }
    writeCell(anotherCell) {
        this.bits.writeBitString(anotherCell.bits);
        for (let r of anotherCell.refs) {
            this.refs.push(r);
        }
    }
    hash() {
        return (0, boc_1.hashCell)(this);
    }
    toBoc(opts) {
        let idx = (opts && opts.idx !== null && opts.idx !== undefined) ? opts.idx : true;
        let crc32 = (opts && opts.crc32 !== null && opts.crc32 !== undefined) ? opts.crc32 : true;
        let cacheBits = (opts && opts.cacheBits !== null && opts.cacheBits !== undefined) ? opts.cacheBits : false;
        let flags = (opts && opts.flags !== null && opts.flags !== undefined) ? opts.flags : 0;
        return (0, boc_1.serializeToBoc)(this, idx, crc32, cacheBits, flags);
    }
    toString(indent) {
        let id = indent || '';
        let s = id + 'x{' + this.bits.toFiftHex() + '}\n';
        for (let k in this.refs) {
            const i = this.refs[k];
            s += i.toString(id + ' ');
        }
        return s;
    }
    withReference(cell) {
        this.refs.push(cell);
        return this;
    }
    withData(src) {
        for (let s of src) {
            if (s === '0') {
                this.bits.writeBit(0);
            }
            else {
                this.bits.writeBit(1);
            }
        }
        return this;
    }
    equals(src) {
        if (src.refs.length !== this.refs.length) {
            return false;
        }
        for (let i = 0; i < src.refs.length; i++) {
            if (!src.refs[i].equals(this.refs[i])) {
                return false;
            }
        }
        return this.bits.equals(src.bits);
    }
}
exports.Cell = Cell;
_a$2 = symbol_inspect_1$2.default;

var Cell$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$2$1 = /*@__PURE__*/getAugmentedNamespace(Cell$1);

var __classPrivateFieldSet$2 = (undefined && undefined.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet$3 = (undefined && undefined.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _TonClient_api;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TonClient = void 0;
const ton_crypto_1$4 = require("ton-crypto");
const Address_1$1 = require("../address/Address");
const Cell_1$5 = require("../boc/Cell");
const HttpApi_1 = require("./api/HttpApi");
const ExternalMessage_1 = require("../messages/ExternalMessage");
const CommonMessageInfo_1$1 = require("../messages/CommonMessageInfo");
const StateInit_1 = require("../messages/StateInit");
const Wallet_1 = require("./Wallet");
const bn_js_1$6 = require("bn.js");
const __1$3 = require("..");
const ConfigContract_1 = require("../contracts/ConfigContract");
const TonCache_1 = require("./TonCache");
function convertMessage(t) {
    return {
        source: t.source !== '' ? Address_1$1.Address.parseFriendly(t.source).address : null,
        destination: t.destination !== '' ? Address_1$1.Address.parseFriendly(t.destination).address : null,
        forwardFee: new bn_js_1$6.BN(t.fwd_fee),
        ihrFee: new bn_js_1$6.BN(t.ihr_fee),
        value: new bn_js_1$6.BN(t.value),
        createdLt: t.created_lt,
        body: (t.msg_data['@type'] === 'msg.dataRaw'
            ? { type: 'data', data: Buffer.from(t.msg_data.body, 'base64') }
            : (t.msg_data['@type'] === 'msg.dataText'
                ? { type: 'text', text: Buffer.from(t.msg_data.text, 'base64').toString('utf-8') }
                : null))
    };
}
function convertTransaction(r) {
    return {
        id: { lt: r.transaction_id.lt, hash: r.transaction_id.hash },
        time: r.utime,
        data: r.data,
        storageFee: new bn_js_1$6.BN(r.storage_fee),
        otherFee: new bn_js_1$6.BN(r.other_fee),
        fee: new bn_js_1$6.BN(r.fee),
        inMessage: r.in_msg ? convertMessage(r.in_msg) : null,
        outMessages: r.out_msgs.map(convertMessage)
    };
}
class TonClient {
    constructor(parameters) {
        _TonClient_api.set(this, void 0);
        this.services = {
            configs: new ConfigContract_1.ConfigContract(this)
        };
        this.parameters = {
            endpoint: parameters.endpoint,
            cache: parameters.cache ? parameters.cache : new TonCache_1.InMemoryCache()
        };
        __classPrivateFieldSet$2(this, _TonClient_api, new HttpApi_1.HttpApi(this.parameters.endpoint, this.parameters.cache, {
            timeout: parameters.timeout,
            apiKey: parameters.apiKey,
            adapter: parameters.httpAdapter
        }), "f");
    }
    /**
     * Get Address Balance
     * @param address address for balance check
     * @returns balance
     */
    async getBalance(address) {
        return (await this.getContractState(address)).balance;
    }
    /**
     * Invoke get method
     * @param address contract address
     * @param name name of method
     * @param params optional parameters
     * @returns stack and gas_used field
     */
    async callGetMethod(address, name, params = []) {
        let res = await __classPrivateFieldGet$3(this, _TonClient_api, "f").callGetMethod(address, name, params);
        if (res.exit_code !== 0) {
            throw Error('Unable to execute get method. Got exit_code: ' + res.exit_code);
        }
        return { gas_used: res.gas_used, stack: res.stack };
    }
    /**
     * Invoke get method that returns error code instead of throwing error
     * @param address contract address
     * @param name name of method
     * @param params optional parameters
     * @returns stack and gas_used field
    */
    async callGetMethodWithError(address, name, params = []) {
        let res = await __classPrivateFieldGet$3(this, _TonClient_api, "f").callGetMethod(address, name, params);
        return { gas_used: res.gas_used, stack: res.stack, exit_code: res.exit_code };
    }
    /**
     * Get transactions
     * @param address address
     */
    async getTransactions(address, opts) {
        // Fetch transactions
        let tx = await __classPrivateFieldGet$3(this, _TonClient_api, "f").getTransactions(address, opts);
        let res = [];
        for (let r of tx) {
            res.push(convertTransaction(r));
        }
        return res;
    }
    /**
     * Get transaction by it's id
     * @param address address
     * @param lt logical time
     * @param hash transaction hash
     * @returns transaction or null if not exist
     */
    async getTransaction(address, lt, hash) {
        let res = await __classPrivateFieldGet$3(this, _TonClient_api, "f").getTransaction(address, lt, hash);
        if (res) {
            return convertTransaction(res);
        }
        else {
            return null;
        }
    }
    /**
     * Fetch latest masterchain info
     * @returns masterchain info
     */
    async getMasterchainInfo() {
        let r = await __classPrivateFieldGet$3(this, _TonClient_api, "f").getMasterchainInfo();
        return {
            workchain: r.init.workchain,
            shard: r.last.shard,
            initSeqno: r.init.seqno,
            latestSeqno: r.last.seqno
        };
    }
    /**
     * Fetch latest workchain shards
     * @param seqno masterchain seqno
     */
    async getWorkchainShards(seqno) {
        let r = await __classPrivateFieldGet$3(this, _TonClient_api, "f").getShards(seqno);
        return r.map((m) => ({
            workchain: m.workchain,
            shard: m.shard,
            seqno: m.seqno
        }));
    }
    /**
     * Fetch transactions inf shards
     * @param workchain
     * @param seqno
     * @param shard
     */
    async getShardTransactions(workchain, seqno, shard) {
        let tx = await __classPrivateFieldGet$3(this, _TonClient_api, "f").getBlockTransactions(workchain, seqno, shard);
        if (tx.incomplete) {
            throw Error('Unsupported');
        }
        return tx.transactions.map((v) => ({
            account: Address_1$1.Address.parseRaw(v.account),
            lt: v.lt,
            hash: v.hash
        }));
    }
    /**
     * Send message to a network
     * @param src source message
     */
    async sendMessage(src) {
        const cell = new Cell_1$5.Cell();
        src.writeTo(cell);
        const boc = await cell.toBoc({ idx: false });
        await __classPrivateFieldGet$3(this, _TonClient_api, "f").sendBoc(boc);
    }
    /**
     * Send file to a network
     * @param src source file
     */
    async sendFile(src) {
        await __classPrivateFieldGet$3(this, _TonClient_api, "f").sendBoc(src);
    }
    /**
     * Estimate fees for external message
     * @param address target address
     * @returns
     */
    async estimateExternalMessageFee(address, args) {
        return await __classPrivateFieldGet$3(this, _TonClient_api, "f").estimateFee(address, { body: args.body, initCode: args.initCode, initData: args.initData, ignoreSignature: args.ignoreSignature });
    }
    /**
     * Send external message to contract
     * @param contract contract to send message
     * @param src message body
     */
    async sendExternalMessage(contract, src) {
        if (await this.isContractDeployed(contract.address)) {
            const message = new ExternalMessage_1.ExternalMessage({
                to: contract.address,
                body: new CommonMessageInfo_1$1.CommonMessageInfo({
                    body: new __1$3.CellMessage(src)
                })
            });
            await this.sendMessage(message);
        }
        else {
            const message = new ExternalMessage_1.ExternalMessage({
                to: contract.address,
                body: new CommonMessageInfo_1$1.CommonMessageInfo({
                    stateInit: new StateInit_1.StateInit({ code: contract.source.initialCode, data: contract.source.initialData }),
                    body: new __1$3.CellMessage(src)
                })
            });
            await this.sendMessage(message);
        }
    }
    /**
     * Check if contract is deployed
     * @param address addres to check
     * @returns true if contract is in active state
     */
    async isContractDeployed(address) {
        return (await this.getContractState(address)).state === 'active';
    }
    /**
     * Resolves contract state
     * @param address contract address
     */
    async getContractState(address) {
        let info = await __classPrivateFieldGet$3(this, _TonClient_api, "f").getAddressInformation(address);
        let balance = new bn_js_1$6.BN(info.balance);
        let state = info.state;
        return {
            balance,
            state,
            code: info.code !== '' ? Buffer.from(info.code, 'base64') : null,
            data: info.data !== '' ? Buffer.from(info.data, 'base64') : null,
            lastTransaction: info.last_transaction_id.lt !== '0' ? {
                lt: info.last_transaction_id.lt,
                hash: info.last_transaction_id.hash,
            } : null,
            blockId: {
                workchain: info.block_id.workchain,
                shard: info.block_id.shard,
                seqno: info.block_id.seqno
            },
            timestampt: info.sync_utime
        };
    }
    /**
     * Open Wallet from address
     * @param source wallet address
     * @returns wallet with specified address
     */
    openWalletFromAddress(args) {
        return Wallet_1.Wallet.open(this, args.source);
    }
    /**
     * Open Wallet from secret key. Searches for best wallet contract.
     * @param workchain wallet workchain
     * @param secretKey wallet secret key
     * @returns best matched wallet
     */
    findWalletFromSecretKey(args) {
        return Wallet_1.Wallet.findBestBySecretKey(this, args.workchain, args.secretKey);
    }
    /**
     * Open wallet with default contract
     * @param args workchain and secret key
     * @returns wallet
     */
    openWalletDefaultFromSecretKey(args) {
        return Wallet_1.Wallet.openDefault(this, args.workchain, args.secretKey);
    }
    /**
     * Open wallet with default contract
     * @param args workchain and secret key
     * @returns wallet
     */
    openWalletFromSecretKey(args) {
        return Wallet_1.Wallet.openByType(this, args.workchain, args.secretKey, args.type);
    }
    /**
     * Opens wallet from custom contract
     * @param src source
     * @returns wallet
     */
    openWalletFromCustomContract(src) {
        return Wallet_1.Wallet.openFromSource(this, src);
    }
    /**
     * Securely creates new wallet
     * @param password optional password
     */
    async createNewWallet(args) {
        let mnemonic = await (0, ton_crypto_1$4.mnemonicNew)(24, args.password);
        let key = await (0, ton_crypto_1$4.mnemonicToWalletKey)(mnemonic, args.password);
        let kind = args.type || 'org.ton.wallets.v3';
        let wallet = Wallet_1.Wallet.openByType(this, args.workchain, key.secretKey, kind);
        return {
            mnemonic,
            key,
            wallet
        };
    }
}
exports.TonClient = TonClient;
_TonClient_api = new WeakMap();

var TonClient$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$3$2 = /*@__PURE__*/getAugmentedNamespace(TonClient$1);

var __classPrivateFieldSet$1 = (undefined && undefined.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet$2 = (undefined && undefined.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault$b = (undefined && undefined.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _Wallet_client, _Wallet_contract;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wallet = exports.validateWalletType = void 0;
const bn_js_1$5 = __importDefault$b(require("bn.js"));
const ton_crypto_1$3 = require("ton-crypto");
const __1$2 = require("..");
const WalletV1R2Source_1 = require("../contracts/sources/WalletV1R2Source");
const WalletV1R3Source_1 = require("../contracts/sources/WalletV1R3Source");
const WalletV2R1Source_1 = require("../contracts/sources/WalletV2R1Source");
const WalletV2R2Source_1 = require("../contracts/sources/WalletV2R2Source");
const WalletV3R1Source_1 = require("../contracts/sources/WalletV3R1Source");
const WalletV3R2Source_1 = require("../contracts/sources/WalletV3R2Source");
const WalletContract_1 = require("../contracts/WalletContract");
const CommonMessageInfo_1 = require("../messages/CommonMessageInfo");
const InternalMessage_1 = require("../messages/InternalMessage");
const SendMode_1 = require("./SendMode");
// Wallet Contract Priority
const allTypes = [
    'org.ton.wallets.simple.r2',
    'org.ton.wallets.simple.r3',
    'org.ton.wallets.v2',
    'org.ton.wallets.v2.r2',
    'org.ton.wallets.v3.r2',
    'org.ton.wallets.v3'
];
function validateWalletType(src) {
    if (src === 'org.ton.wallets.simple'
        || src === 'org.ton.wallets.simple.r2'
        || src === 'org.ton.wallets.simple.r3'
        || src === 'org.ton.wallets.v2'
        || src === 'org.ton.wallets.v2.r2'
        || src === 'org.ton.wallets.v3'
        || src === 'org.ton.wallets.v3.r2') {
        return src;
    }
    return null;
}
exports.validateWalletType = validateWalletType;
function createContract(client, type, publicKey, workchain) {
    if (type === 'org.ton.wallets.simple') {
        throw Error('Unsupported wallet');
    }
    else if (type === 'org.ton.wallets.simple.r2') {
        return WalletContract_1.WalletContract.create(client, WalletV1R2Source_1.WalletV1R2Source.create({ publicKey, workchain }));
    }
    else if (type === 'org.ton.wallets.simple.r3') {
        return WalletContract_1.WalletContract.create(client, WalletV1R3Source_1.WalletV1R3Source.create({ publicKey, workchain }));
    }
    else if (type === 'org.ton.wallets.v2') {
        return WalletContract_1.WalletContract.create(client, WalletV2R1Source_1.WalletV2R1Source.create({ publicKey, workchain }));
    }
    else if (type === 'org.ton.wallets.v2.r2') {
        return WalletContract_1.WalletContract.create(client, WalletV2R2Source_1.WalletV2R2Source.create({ publicKey, workchain }));
    }
    else if (type === 'org.ton.wallets.v3') {
        return WalletContract_1.WalletContract.create(client, WalletV3R1Source_1.WalletV3R1Source.create({ publicKey, workchain }));
    }
    else if (type === 'org.ton.wallets.v3.r2') {
        return WalletContract_1.WalletContract.create(client, WalletV3R2Source_1.WalletV3R2Source.create({ publicKey, workchain }));
    }
    else {
        throw Error('Unknown wallet type: ' + type);
    }
}
class Wallet {
    constructor(client, address) {
        _Wallet_client.set(this, void 0);
        _Wallet_contract.set(this, null);
        __classPrivateFieldSet$1(this, _Wallet_client, client, "f");
        this.address = address;
    }
    static open(client, address) {
        return new Wallet(client, address);
    }
    static openDefault(client, workchain, secretKey) {
        const publicKey = (0, ton_crypto_1$3.keyPairFromSecretKey)(secretKey).publicKey;
        let c = createContract(client, 'org.ton.wallets.v3', publicKey, workchain);
        let w = new Wallet(client, c.address);
        w.prepare(workchain, publicKey, 'org.ton.wallets.v3');
        return w;
    }
    static openByType(client, workchain, secretKey, type) {
        const publicKey = (0, ton_crypto_1$3.keyPairFromSecretKey)(secretKey).publicKey;
        let c = createContract(client, type, publicKey, workchain);
        let w = new Wallet(client, c.address);
        w.prepare(workchain, publicKey, type);
        return w;
    }
    static openFromSource(client, source) {
        let address = (0, __1$2.contractAddress)(source);
        let w = new Wallet(client, address);
        w.prepareFromSource(source);
        return w;
    }
    static async findActiveBySecretKey(client, workchain, secretKey) {
        const publicKey = (0, ton_crypto_1$3.keyPairFromSecretKey)(secretKey).publicKey;
        let types = [];
        for (let type of allTypes) {
            let contra = createContract(client, type, publicKey, workchain);
            let deployed = await client.isContractDeployed(contra.address);
            let balance = await client.getBalance(contra.address);
            if (deployed || balance.gt(new bn_js_1$5.default(0))) {
                types.push({ address: contra.address, type, balance, deployed });
            }
        }
        return types;
    }
    static async findBestBySecretKey(client, workchain, secretKey) {
        const publicKey = (0, ton_crypto_1$3.keyPairFromSecretKey)(secretKey).publicKey;
        let allActive = await this.findActiveBySecretKey(client, workchain, secretKey);
        // Create default one if no wallet exists
        if (allActive.length === 0) {
            return this.openDefault(client, workchain, secretKey);
        }
        // Try to match with biggest balance
        let maxBalance = allActive[0].balance;
        let bestContract = allActive[0].type;
        for (let i = 1; i < allActive.length; i++) {
            let ac = allActive[i];
            // Contracts are sorted by priority
            if (ac.balance.gte(maxBalance)) {
                maxBalance = ac.balance;
                bestContract = ac.type;
            }
        }
        if (maxBalance.gt(new bn_js_1$5.default(0))) {
            let c = createContract(client, bestContract, publicKey, workchain);
            let w = new Wallet(client, c.address);
            w.prepare(workchain, publicKey, bestContract);
            return w;
        }
        // Return last (as most recent)
        let c = createContract(client, allActive[allActive.length - 1].type, publicKey, workchain);
        let w = new Wallet(client, c.address);
        w.prepare(workchain, publicKey, allActive[allActive.length - 1].type);
        return w;
    }
    get prepared() {
        return !!__classPrivateFieldGet$2(this, _Wallet_contract, "f");
    }
    async getSeqNo() {
        if (await __classPrivateFieldGet$2(this, _Wallet_client, "f").isContractDeployed(this.address)) {
            let res = await __classPrivateFieldGet$2(this, _Wallet_client, "f").callGetMethod(this.address, 'seqno');
            return parseInt(res.stack[0][1], 16);
        }
        else {
            return 0;
        }
    }
    prepare(workchain, publicKey, type = 'org.ton.wallets.v3') {
        let contra = createContract(__classPrivateFieldGet$2(this, _Wallet_client, "f"), type, publicKey, workchain);
        if (!contra.address.equals(this.address)) {
            throw Error('Contract have different address');
        }
        __classPrivateFieldSet$1(this, _Wallet_contract, contra, "f");
    }
    prepareFromSource(source) {
        let contra = WalletContract_1.WalletContract.create(__classPrivateFieldGet$2(this, _Wallet_client, "f"), source);
        if (!contra.address.equals(this.address)) {
            throw Error('Contract have different address');
        }
        __classPrivateFieldSet$1(this, _Wallet_contract, contra, "f");
    }
    /**
     * Transfers value to specified address
     */
    async transfer(args) {
        const contract = __classPrivateFieldGet$2(this, _Wallet_contract, "f");
        if (!contract) {
            throw Error('Please, prepare wallet first');
        }
        // Resolve payload
        let payload = null;
        if (args.payload) {
            if (typeof args.payload === 'string') {
                payload = new __1$2.CommentMessage(args.payload);
            }
            else if (Buffer.isBuffer(args.payload)) {
                payload = new __1$2.BinaryMessage(args.payload);
            }
        }
        // Check transfer
        const transfer = await contract.createTransfer({
            secretKey: args.secretKey,
            seqno: args.seqno,
            sendMode: args.sendMode || (SendMode_1.SendMode.IGNORE_ERRORS + SendMode_1.SendMode.PAY_GAS_SEPARATLY),
            timeout: args.timeout,
            order: new InternalMessage_1.InternalMessage({
                to: args.to,
                value: args.value,
                bounce: args.bounce,
                body: new CommonMessageInfo_1.CommonMessageInfo({ body: payload })
            })
        });
        // Send
        await __classPrivateFieldGet$2(this, _Wallet_client, "f").sendExternalMessage(contract, transfer);
    }
    /**
     * Signing transfer request. Could be done offline.
     * @param args sign
     * @returns
     */
    transferSign(args) {
        const contract = __classPrivateFieldGet$2(this, _Wallet_contract, "f");
        if (!contract) {
            throw Error('Please, prepare wallet first');
        }
        // Resolve payload
        let payload = null;
        if (args.payload) {
            if (typeof args.payload === 'string') {
                payload = new __1$2.CommentMessage(args.payload);
            }
            else if (Buffer.isBuffer(args.payload)) {
                payload = new __1$2.BinaryMessage(args.payload);
            }
        }
        // Transfer
        const transfer = contract.createTransfer({
            secretKey: args.secretKey,
            seqno: args.seqno,
            sendMode: args.sendMode || (SendMode_1.SendMode.IGNORE_ERRORS + SendMode_1.SendMode.PAY_GAS_SEPARATLY),
            timeout: args.timeout,
            order: new InternalMessage_1.InternalMessage({
                to: args.to,
                value: args.value,
                bounce: args.bounce,
                body: new CommonMessageInfo_1.CommonMessageInfo({ body: payload })
            })
        });
        // External message
        const message = new __1$2.ExternalMessage({
            to: contract.address,
            body: new CommonMessageInfo_1.CommonMessageInfo({
                stateInit: new __1$2.StateInit({ code: contract.source.initialCode, data: contract.source.initialData }),
                body: new __1$2.CellMessage(transfer)
            })
        });
        const res = new __1$2.Cell();
        message.writeTo(res);
        return res;
    }
    /**
     * Commit prepared transfer
     * @param transfer signed transfer for commit
     */
    async transferCommit(transfer) {
        await __classPrivateFieldGet$2(this, _Wallet_client, "f").sendFile(transfer.toBoc({ idx: false }));
    }
}
exports.Wallet = Wallet;
_Wallet_client = new WeakMap(), _Wallet_contract = new WeakMap();

var Wallet$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$4$1 = /*@__PURE__*/getAugmentedNamespace(Wallet$1);

var __importDefault$a = (undefined && undefined.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a$1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Address = void 0;
const symbol_inspect_1$1 = __importDefault$a(require("symbol.inspect"));
const crc16_1$1 = require("../utils/crc16");
const bounceable_tag = 0x11;
const non_bounceable_tag = 0x51;
const test_flag = 0x80;
function parseFriendlyAddress(src) {
    const data = Buffer.isBuffer(src) ? src : Buffer.from(src, 'base64');
    // 1byte tag + 1byte workchain + 32 bytes hash + 2 byte crc
    if (data.length !== 36) {
        throw new Error('Unknown address type: byte length is not equal to 36');
    }
    // Prepare data
    const addr = data.slice(0, 34);
    const crc = data.slice(34, 36);
    const calcedCrc = (0, crc16_1$1.crc16)(addr);
    if (!(calcedCrc[0] === crc[0] && calcedCrc[1] === crc[1])) {
        throw new Error('Invalid checksum: ' + src);
    }
    // Parse tag
    let tag = addr[0];
    let isTestOnly = false;
    let isBounceable = false;
    if (tag & test_flag) {
        isTestOnly = true;
        tag = tag ^ test_flag;
    }
    if ((tag !== bounceable_tag) && (tag !== non_bounceable_tag))
        throw "Unknown address tag";
    isBounceable = tag === bounceable_tag;
    let workchain = null;
    if (addr[1] === 0xff) { // TODO we should read signed integer here
        workchain = -1;
    }
    else {
        workchain = addr[1];
    }
    const hashPart = addr.slice(2, 34);
    return { isTestOnly, isBounceable, workchain, hashPart };
}
class Address {
    constructor(workChain, hash) {
        this.toString = () => {
            return this.workChain + ':' + this.hash.toString('hex');
        };
        this.toBuffer = () => {
            const addressWithChecksum = Buffer.alloc(36);
            addressWithChecksum.set(this.hash);
            addressWithChecksum.set([this.workChain, this.workChain, this.workChain, this.workChain], 32);
            return addressWithChecksum;
        };
        this.toFriendlyBuffer = (args) => {
            let testOnly = (args && args.testOnly !== undefined) ? args.testOnly : false;
            let bounceable = (args && args.bounceable !== undefined) ? args.bounceable : true;
            let tag = bounceable ? bounceable_tag : non_bounceable_tag;
            if (testOnly) {
                tag |= test_flag;
            }
            const addr = Buffer.alloc(34);
            addr[0] = tag;
            addr[1] = this.workChain;
            addr.set(this.hash, 2);
            const addressWithChecksum = Buffer.alloc(36);
            addressWithChecksum.set(addr);
            addressWithChecksum.set((0, crc16_1$1.crc16)(addr), 34);
            return addressWithChecksum;
        };
        this.toFriendly = (args) => {
            let urlSafe = (args && args.urlSafe !== undefined) ? args.urlSafe : true;
            let buffer = this.toFriendlyBuffer(args);
            if (urlSafe) {
                return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
            }
            else {
                return buffer.toString('base64');
            }
        };
        this[_a$1] = () => this.toFriendly();
        this.workChain = workChain;
        this.hash = hash;
        Object.freeze(this);
    }
    static isFriendly(source) {
        return source.indexOf(':') < 0;
    }
    static normalize(source) {
        if (typeof source === 'string') {
            return Address.parse(source).toFriendly();
        }
        else {
            return source.toFriendly();
        }
    }
    static parse(source) {
        if (Address.isFriendly(source)) {
            return this.parseFriendly(source).address;
        }
        else {
            return this.parseRaw(source);
        }
    }
    static parseRaw(source) {
        let workChain = parseInt(source.split(":")[0]);
        let hash = Buffer.from(source.split(":")[1], 'hex');
        return new Address(workChain, hash);
    }
    static parseFriendly(source) {
        if (Buffer.isBuffer(source)) {
            let r = parseFriendlyAddress(source);
            return {
                isBounceable: r.isBounceable,
                isTestOnly: r.isTestOnly,
                address: new Address(r.workchain, r.hashPart)
            };
        }
        else {
            let addr = source.replace(/\-/g, '+').replace(/_/g, '\/'); // Convert from url-friendly to true base64
            let r = parseFriendlyAddress(addr);
            return {
                isBounceable: r.isBounceable,
                isTestOnly: r.isTestOnly,
                address: new Address(r.workchain, r.hashPart)
            };
        }
    }
    equals(src) {
        if (src.workChain !== this.workChain) {
            return false;
        }
        return src.hash.equals(this.hash);
    }
}
exports.Address = Address;
_a$1 = symbol_inspect_1$1.default;

var Address$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$5$1 = /*@__PURE__*/getAugmentedNamespace(Address$1);

var convert = {};

function commonjsRequire(path) {
	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}

var bn$2 = {exports: {}};

(function (module) {
	(function (module, exports) {

	  // Utils
	  function assert (val, msg) {
	    if (!val) throw new Error(msg || 'Assertion failed');
	  }

	  // Could use `inherits` module, but don't want to move from single file
	  // architecture yet.
	  function inherits (ctor, superCtor) {
	    ctor.super_ = superCtor;
	    var TempCtor = function () {};
	    TempCtor.prototype = superCtor.prototype;
	    ctor.prototype = new TempCtor();
	    ctor.prototype.constructor = ctor;
	  }

	  // BN

	  function BN (number, base, endian) {
	    if (BN.isBN(number)) {
	      return number;
	    }

	    this.negative = 0;
	    this.words = null;
	    this.length = 0;

	    // Reduction context
	    this.red = null;

	    if (number !== null) {
	      if (base === 'le' || base === 'be') {
	        endian = base;
	        base = 10;
	      }

	      this._init(number || 0, base || 10, endian || 'be');
	    }
	  }
	  if (typeof module === 'object') {
	    module.exports = BN;
	  } else {
	    exports.BN = BN;
	  }

	  BN.BN = BN;
	  BN.wordSize = 26;

	  var Buffer;
	  try {
	    Buffer = commonjsRequire('buf' + 'fer').Buffer;
	  } catch (e) {
	  }

	  BN.isBN = function isBN (num) {
	    if (num instanceof BN) {
	      return true;
	    }

	    return num !== null && typeof num === 'object' &&
	      num.constructor.wordSize === BN.wordSize && Array.isArray(num.words);
	  };

	  BN.max = function max (left, right) {
	    if (left.cmp(right) > 0) return left;
	    return right;
	  };

	  BN.min = function min (left, right) {
	    if (left.cmp(right) < 0) return left;
	    return right;
	  };

	  BN.prototype._init = function init (number, base, endian) {
	    if (typeof number === 'number') {
	      return this._initNumber(number, base, endian);
	    }

	    if (typeof number === 'object') {
	      return this._initArray(number, base, endian);
	    }

	    if (base === 'hex') {
	      base = 16;
	    }
	    assert(base === (base | 0) && base >= 2 && base <= 36);

	    number = number.toString().replace(/\s+/g, '');
	    var start = 0;
	    if (number[0] === '-') {
	      start++;
	    }

	    if (base === 16) {
	      this._parseHex(number, start);
	    } else {
	      this._parseBase(number, base, start);
	    }

	    if (number[0] === '-') {
	      this.negative = 1;
	    }

	    this.strip();

	    if (endian !== 'le') return;

	    this._initArray(this.toArray(), base, endian);
	  };

	  BN.prototype._initNumber = function _initNumber (number, base, endian) {
	    if (number < 0) {
	      this.negative = 1;
	      number = -number;
	    }
	    if (number < 0x4000000) {
	      this.words = [ number & 0x3ffffff ];
	      this.length = 1;
	    } else if (number < 0x10000000000000) {
	      this.words = [
	        number & 0x3ffffff,
	        (number / 0x4000000) & 0x3ffffff
	      ];
	      this.length = 2;
	    } else {
	      assert(number < 0x20000000000000); // 2 ^ 53 (unsafe)
	      this.words = [
	        number & 0x3ffffff,
	        (number / 0x4000000) & 0x3ffffff,
	        1
	      ];
	      this.length = 3;
	    }

	    if (endian !== 'le') return;

	    // Reverse the bytes
	    this._initArray(this.toArray(), base, endian);
	  };

	  BN.prototype._initArray = function _initArray (number, base, endian) {
	    // Perhaps a Uint8Array
	    assert(typeof number.length === 'number');
	    if (number.length <= 0) {
	      this.words = [ 0 ];
	      this.length = 1;
	      return this;
	    }

	    this.length = Math.ceil(number.length / 3);
	    this.words = new Array(this.length);
	    for (var i = 0; i < this.length; i++) {
	      this.words[i] = 0;
	    }

	    var j, w;
	    var off = 0;
	    if (endian === 'be') {
	      for (i = number.length - 1, j = 0; i >= 0; i -= 3) {
	        w = number[i] | (number[i - 1] << 8) | (number[i - 2] << 16);
	        this.words[j] |= (w << off) & 0x3ffffff;
	        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
	        off += 24;
	        if (off >= 26) {
	          off -= 26;
	          j++;
	        }
	      }
	    } else if (endian === 'le') {
	      for (i = 0, j = 0; i < number.length; i += 3) {
	        w = number[i] | (number[i + 1] << 8) | (number[i + 2] << 16);
	        this.words[j] |= (w << off) & 0x3ffffff;
	        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
	        off += 24;
	        if (off >= 26) {
	          off -= 26;
	          j++;
	        }
	      }
	    }
	    return this.strip();
	  };

	  function parseHex (str, start, end) {
	    var r = 0;
	    var len = Math.min(str.length, end);
	    for (var i = start; i < len; i++) {
	      var c = str.charCodeAt(i) - 48;

	      r <<= 4;

	      // 'a' - 'f'
	      if (c >= 49 && c <= 54) {
	        r |= c - 49 + 0xa;

	      // 'A' - 'F'
	      } else if (c >= 17 && c <= 22) {
	        r |= c - 17 + 0xa;

	      // '0' - '9'
	      } else {
	        r |= c & 0xf;
	      }
	    }
	    return r;
	  }

	  BN.prototype._parseHex = function _parseHex (number, start) {
	    // Create possibly bigger array to ensure that it fits the number
	    this.length = Math.ceil((number.length - start) / 6);
	    this.words = new Array(this.length);
	    for (var i = 0; i < this.length; i++) {
	      this.words[i] = 0;
	    }

	    var j, w;
	    // Scan 24-bit chunks and add them to the number
	    var off = 0;
	    for (i = number.length - 6, j = 0; i >= start; i -= 6) {
	      w = parseHex(number, i, i + 6);
	      this.words[j] |= (w << off) & 0x3ffffff;
	      // NOTE: `0x3fffff` is intentional here, 26bits max shift + 24bit hex limb
	      this.words[j + 1] |= w >>> (26 - off) & 0x3fffff;
	      off += 24;
	      if (off >= 26) {
	        off -= 26;
	        j++;
	      }
	    }
	    if (i + 6 !== start) {
	      w = parseHex(number, start, i + 6);
	      this.words[j] |= (w << off) & 0x3ffffff;
	      this.words[j + 1] |= w >>> (26 - off) & 0x3fffff;
	    }
	    this.strip();
	  };

	  function parseBase (str, start, end, mul) {
	    var r = 0;
	    var len = Math.min(str.length, end);
	    for (var i = start; i < len; i++) {
	      var c = str.charCodeAt(i) - 48;

	      r *= mul;

	      // 'a'
	      if (c >= 49) {
	        r += c - 49 + 0xa;

	      // 'A'
	      } else if (c >= 17) {
	        r += c - 17 + 0xa;

	      // '0' - '9'
	      } else {
	        r += c;
	      }
	    }
	    return r;
	  }

	  BN.prototype._parseBase = function _parseBase (number, base, start) {
	    // Initialize as zero
	    this.words = [ 0 ];
	    this.length = 1;

	    // Find length of limb in base
	    for (var limbLen = 0, limbPow = 1; limbPow <= 0x3ffffff; limbPow *= base) {
	      limbLen++;
	    }
	    limbLen--;
	    limbPow = (limbPow / base) | 0;

	    var total = number.length - start;
	    var mod = total % limbLen;
	    var end = Math.min(total, total - mod) + start;

	    var word = 0;
	    for (var i = start; i < end; i += limbLen) {
	      word = parseBase(number, i, i + limbLen, base);

	      this.imuln(limbPow);
	      if (this.words[0] + word < 0x4000000) {
	        this.words[0] += word;
	      } else {
	        this._iaddn(word);
	      }
	    }

	    if (mod !== 0) {
	      var pow = 1;
	      word = parseBase(number, i, number.length, base);

	      for (i = 0; i < mod; i++) {
	        pow *= base;
	      }

	      this.imuln(pow);
	      if (this.words[0] + word < 0x4000000) {
	        this.words[0] += word;
	      } else {
	        this._iaddn(word);
	      }
	    }
	  };

	  BN.prototype.copy = function copy (dest) {
	    dest.words = new Array(this.length);
	    for (var i = 0; i < this.length; i++) {
	      dest.words[i] = this.words[i];
	    }
	    dest.length = this.length;
	    dest.negative = this.negative;
	    dest.red = this.red;
	  };

	  BN.prototype.clone = function clone () {
	    var r = new BN(null);
	    this.copy(r);
	    return r;
	  };

	  BN.prototype._expand = function _expand (size) {
	    while (this.length < size) {
	      this.words[this.length++] = 0;
	    }
	    return this;
	  };

	  // Remove leading `0` from `this`
	  BN.prototype.strip = function strip () {
	    while (this.length > 1 && this.words[this.length - 1] === 0) {
	      this.length--;
	    }
	    return this._normSign();
	  };

	  BN.prototype._normSign = function _normSign () {
	    // -0 = 0
	    if (this.length === 1 && this.words[0] === 0) {
	      this.negative = 0;
	    }
	    return this;
	  };

	  BN.prototype.inspect = function inspect () {
	    return (this.red ? '<BN-R: ' : '<BN: ') + this.toString(16) + '>';
	  };

	  /*

	  var zeros = [];
	  var groupSizes = [];
	  var groupBases = [];

	  var s = '';
	  var i = -1;
	  while (++i < BN.wordSize) {
	    zeros[i] = s;
	    s += '0';
	  }
	  groupSizes[0] = 0;
	  groupSizes[1] = 0;
	  groupBases[0] = 0;
	  groupBases[1] = 0;
	  var base = 2 - 1;
	  while (++base < 36 + 1) {
	    var groupSize = 0;
	    var groupBase = 1;
	    while (groupBase < (1 << BN.wordSize) / base) {
	      groupBase *= base;
	      groupSize += 1;
	    }
	    groupSizes[base] = groupSize;
	    groupBases[base] = groupBase;
	  }

	  */

	  var zeros = [
	    '',
	    '0',
	    '00',
	    '000',
	    '0000',
	    '00000',
	    '000000',
	    '0000000',
	    '00000000',
	    '000000000',
	    '0000000000',
	    '00000000000',
	    '000000000000',
	    '0000000000000',
	    '00000000000000',
	    '000000000000000',
	    '0000000000000000',
	    '00000000000000000',
	    '000000000000000000',
	    '0000000000000000000',
	    '00000000000000000000',
	    '000000000000000000000',
	    '0000000000000000000000',
	    '00000000000000000000000',
	    '000000000000000000000000',
	    '0000000000000000000000000'
	  ];

	  var groupSizes = [
	    0, 0,
	    25, 16, 12, 11, 10, 9, 8,
	    8, 7, 7, 7, 7, 6, 6,
	    6, 6, 6, 6, 6, 5, 5,
	    5, 5, 5, 5, 5, 5, 5,
	    5, 5, 5, 5, 5, 5, 5
	  ];

	  var groupBases = [
	    0, 0,
	    33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216,
	    43046721, 10000000, 19487171, 35831808, 62748517, 7529536, 11390625,
	    16777216, 24137569, 34012224, 47045881, 64000000, 4084101, 5153632,
	    6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149,
	    24300000, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176
	  ];

	  BN.prototype.toString = function toString (base, padding) {
	    base = base || 10;
	    padding = padding | 0 || 1;

	    var out;
	    if (base === 16 || base === 'hex') {
	      out = '';
	      var off = 0;
	      var carry = 0;
	      for (var i = 0; i < this.length; i++) {
	        var w = this.words[i];
	        var word = (((w << off) | carry) & 0xffffff).toString(16);
	        carry = (w >>> (24 - off)) & 0xffffff;
	        if (carry !== 0 || i !== this.length - 1) {
	          out = zeros[6 - word.length] + word + out;
	        } else {
	          out = word + out;
	        }
	        off += 2;
	        if (off >= 26) {
	          off -= 26;
	          i--;
	        }
	      }
	      if (carry !== 0) {
	        out = carry.toString(16) + out;
	      }
	      while (out.length % padding !== 0) {
	        out = '0' + out;
	      }
	      if (this.negative !== 0) {
	        out = '-' + out;
	      }
	      return out;
	    }

	    if (base === (base | 0) && base >= 2 && base <= 36) {
	      // var groupSize = Math.floor(BN.wordSize * Math.LN2 / Math.log(base));
	      var groupSize = groupSizes[base];
	      // var groupBase = Math.pow(base, groupSize);
	      var groupBase = groupBases[base];
	      out = '';
	      var c = this.clone();
	      c.negative = 0;
	      while (!c.isZero()) {
	        var r = c.modn(groupBase).toString(base);
	        c = c.idivn(groupBase);

	        if (!c.isZero()) {
	          out = zeros[groupSize - r.length] + r + out;
	        } else {
	          out = r + out;
	        }
	      }
	      if (this.isZero()) {
	        out = '0' + out;
	      }
	      while (out.length % padding !== 0) {
	        out = '0' + out;
	      }
	      if (this.negative !== 0) {
	        out = '-' + out;
	      }
	      return out;
	    }

	    assert(false, 'Base should be between 2 and 36');
	  };

	  BN.prototype.toNumber = function toNumber () {
	    var ret = this.words[0];
	    if (this.length === 2) {
	      ret += this.words[1] * 0x4000000;
	    } else if (this.length === 3 && this.words[2] === 0x01) {
	      // NOTE: at this stage it is known that the top bit is set
	      ret += 0x10000000000000 + (this.words[1] * 0x4000000);
	    } else if (this.length > 2) {
	      assert(false, 'Number can only safely store up to 53 bits');
	    }
	    return (this.negative !== 0) ? -ret : ret;
	  };

	  BN.prototype.toJSON = function toJSON () {
	    return this.toString(16);
	  };

	  BN.prototype.toBuffer = function toBuffer (endian, length) {
	    assert(typeof Buffer !== 'undefined');
	    return this.toArrayLike(Buffer, endian, length);
	  };

	  BN.prototype.toArray = function toArray (endian, length) {
	    return this.toArrayLike(Array, endian, length);
	  };

	  BN.prototype.toArrayLike = function toArrayLike (ArrayType, endian, length) {
	    var byteLength = this.byteLength();
	    var reqLength = length || Math.max(1, byteLength);
	    assert(byteLength <= reqLength, 'byte array longer than desired length');
	    assert(reqLength > 0, 'Requested array length <= 0');

	    this.strip();
	    var littleEndian = endian === 'le';
	    var res = new ArrayType(reqLength);

	    var b, i;
	    var q = this.clone();
	    if (!littleEndian) {
	      // Assume big-endian
	      for (i = 0; i < reqLength - byteLength; i++) {
	        res[i] = 0;
	      }

	      for (i = 0; !q.isZero(); i++) {
	        b = q.andln(0xff);
	        q.iushrn(8);

	        res[reqLength - i - 1] = b;
	      }
	    } else {
	      for (i = 0; !q.isZero(); i++) {
	        b = q.andln(0xff);
	        q.iushrn(8);

	        res[i] = b;
	      }

	      for (; i < reqLength; i++) {
	        res[i] = 0;
	      }
	    }

	    return res;
	  };

	  if (Math.clz32) {
	    BN.prototype._countBits = function _countBits (w) {
	      return 32 - Math.clz32(w);
	    };
	  } else {
	    BN.prototype._countBits = function _countBits (w) {
	      var t = w;
	      var r = 0;
	      if (t >= 0x1000) {
	        r += 13;
	        t >>>= 13;
	      }
	      if (t >= 0x40) {
	        r += 7;
	        t >>>= 7;
	      }
	      if (t >= 0x8) {
	        r += 4;
	        t >>>= 4;
	      }
	      if (t >= 0x02) {
	        r += 2;
	        t >>>= 2;
	      }
	      return r + t;
	    };
	  }

	  BN.prototype._zeroBits = function _zeroBits (w) {
	    // Short-cut
	    if (w === 0) return 26;

	    var t = w;
	    var r = 0;
	    if ((t & 0x1fff) === 0) {
	      r += 13;
	      t >>>= 13;
	    }
	    if ((t & 0x7f) === 0) {
	      r += 7;
	      t >>>= 7;
	    }
	    if ((t & 0xf) === 0) {
	      r += 4;
	      t >>>= 4;
	    }
	    if ((t & 0x3) === 0) {
	      r += 2;
	      t >>>= 2;
	    }
	    if ((t & 0x1) === 0) {
	      r++;
	    }
	    return r;
	  };

	  // Return number of used bits in a BN
	  BN.prototype.bitLength = function bitLength () {
	    var w = this.words[this.length - 1];
	    var hi = this._countBits(w);
	    return (this.length - 1) * 26 + hi;
	  };

	  function toBitArray (num) {
	    var w = new Array(num.bitLength());

	    for (var bit = 0; bit < w.length; bit++) {
	      var off = (bit / 26) | 0;
	      var wbit = bit % 26;

	      w[bit] = (num.words[off] & (1 << wbit)) >>> wbit;
	    }

	    return w;
	  }

	  // Number of trailing zero bits
	  BN.prototype.zeroBits = function zeroBits () {
	    if (this.isZero()) return 0;

	    var r = 0;
	    for (var i = 0; i < this.length; i++) {
	      var b = this._zeroBits(this.words[i]);
	      r += b;
	      if (b !== 26) break;
	    }
	    return r;
	  };

	  BN.prototype.byteLength = function byteLength () {
	    return Math.ceil(this.bitLength() / 8);
	  };

	  BN.prototype.toTwos = function toTwos (width) {
	    if (this.negative !== 0) {
	      return this.abs().inotn(width).iaddn(1);
	    }
	    return this.clone();
	  };

	  BN.prototype.fromTwos = function fromTwos (width) {
	    if (this.testn(width - 1)) {
	      return this.notn(width).iaddn(1).ineg();
	    }
	    return this.clone();
	  };

	  BN.prototype.isNeg = function isNeg () {
	    return this.negative !== 0;
	  };

	  // Return negative clone of `this`
	  BN.prototype.neg = function neg () {
	    return this.clone().ineg();
	  };

	  BN.prototype.ineg = function ineg () {
	    if (!this.isZero()) {
	      this.negative ^= 1;
	    }

	    return this;
	  };

	  // Or `num` with `this` in-place
	  BN.prototype.iuor = function iuor (num) {
	    while (this.length < num.length) {
	      this.words[this.length++] = 0;
	    }

	    for (var i = 0; i < num.length; i++) {
	      this.words[i] = this.words[i] | num.words[i];
	    }

	    return this.strip();
	  };

	  BN.prototype.ior = function ior (num) {
	    assert((this.negative | num.negative) === 0);
	    return this.iuor(num);
	  };

	  // Or `num` with `this`
	  BN.prototype.or = function or (num) {
	    if (this.length > num.length) return this.clone().ior(num);
	    return num.clone().ior(this);
	  };

	  BN.prototype.uor = function uor (num) {
	    if (this.length > num.length) return this.clone().iuor(num);
	    return num.clone().iuor(this);
	  };

	  // And `num` with `this` in-place
	  BN.prototype.iuand = function iuand (num) {
	    // b = min-length(num, this)
	    var b;
	    if (this.length > num.length) {
	      b = num;
	    } else {
	      b = this;
	    }

	    for (var i = 0; i < b.length; i++) {
	      this.words[i] = this.words[i] & num.words[i];
	    }

	    this.length = b.length;

	    return this.strip();
	  };

	  BN.prototype.iand = function iand (num) {
	    assert((this.negative | num.negative) === 0);
	    return this.iuand(num);
	  };

	  // And `num` with `this`
	  BN.prototype.and = function and (num) {
	    if (this.length > num.length) return this.clone().iand(num);
	    return num.clone().iand(this);
	  };

	  BN.prototype.uand = function uand (num) {
	    if (this.length > num.length) return this.clone().iuand(num);
	    return num.clone().iuand(this);
	  };

	  // Xor `num` with `this` in-place
	  BN.prototype.iuxor = function iuxor (num) {
	    // a.length > b.length
	    var a;
	    var b;
	    if (this.length > num.length) {
	      a = this;
	      b = num;
	    } else {
	      a = num;
	      b = this;
	    }

	    for (var i = 0; i < b.length; i++) {
	      this.words[i] = a.words[i] ^ b.words[i];
	    }

	    if (this !== a) {
	      for (; i < a.length; i++) {
	        this.words[i] = a.words[i];
	      }
	    }

	    this.length = a.length;

	    return this.strip();
	  };

	  BN.prototype.ixor = function ixor (num) {
	    assert((this.negative | num.negative) === 0);
	    return this.iuxor(num);
	  };

	  // Xor `num` with `this`
	  BN.prototype.xor = function xor (num) {
	    if (this.length > num.length) return this.clone().ixor(num);
	    return num.clone().ixor(this);
	  };

	  BN.prototype.uxor = function uxor (num) {
	    if (this.length > num.length) return this.clone().iuxor(num);
	    return num.clone().iuxor(this);
	  };

	  // Not ``this`` with ``width`` bitwidth
	  BN.prototype.inotn = function inotn (width) {
	    assert(typeof width === 'number' && width >= 0);

	    var bytesNeeded = Math.ceil(width / 26) | 0;
	    var bitsLeft = width % 26;

	    // Extend the buffer with leading zeroes
	    this._expand(bytesNeeded);

	    if (bitsLeft > 0) {
	      bytesNeeded--;
	    }

	    // Handle complete words
	    for (var i = 0; i < bytesNeeded; i++) {
	      this.words[i] = ~this.words[i] & 0x3ffffff;
	    }

	    // Handle the residue
	    if (bitsLeft > 0) {
	      this.words[i] = ~this.words[i] & (0x3ffffff >> (26 - bitsLeft));
	    }

	    // And remove leading zeroes
	    return this.strip();
	  };

	  BN.prototype.notn = function notn (width) {
	    return this.clone().inotn(width);
	  };

	  // Set `bit` of `this`
	  BN.prototype.setn = function setn (bit, val) {
	    assert(typeof bit === 'number' && bit >= 0);

	    var off = (bit / 26) | 0;
	    var wbit = bit % 26;

	    this._expand(off + 1);

	    if (val) {
	      this.words[off] = this.words[off] | (1 << wbit);
	    } else {
	      this.words[off] = this.words[off] & ~(1 << wbit);
	    }

	    return this.strip();
	  };

	  // Add `num` to `this` in-place
	  BN.prototype.iadd = function iadd (num) {
	    var r;

	    // negative + positive
	    if (this.negative !== 0 && num.negative === 0) {
	      this.negative = 0;
	      r = this.isub(num);
	      this.negative ^= 1;
	      return this._normSign();

	    // positive + negative
	    } else if (this.negative === 0 && num.negative !== 0) {
	      num.negative = 0;
	      r = this.isub(num);
	      num.negative = 1;
	      return r._normSign();
	    }

	    // a.length > b.length
	    var a, b;
	    if (this.length > num.length) {
	      a = this;
	      b = num;
	    } else {
	      a = num;
	      b = this;
	    }

	    var carry = 0;
	    for (var i = 0; i < b.length; i++) {
	      r = (a.words[i] | 0) + (b.words[i] | 0) + carry;
	      this.words[i] = r & 0x3ffffff;
	      carry = r >>> 26;
	    }
	    for (; carry !== 0 && i < a.length; i++) {
	      r = (a.words[i] | 0) + carry;
	      this.words[i] = r & 0x3ffffff;
	      carry = r >>> 26;
	    }

	    this.length = a.length;
	    if (carry !== 0) {
	      this.words[this.length] = carry;
	      this.length++;
	    // Copy the rest of the words
	    } else if (a !== this) {
	      for (; i < a.length; i++) {
	        this.words[i] = a.words[i];
	      }
	    }

	    return this;
	  };

	  // Add `num` to `this`
	  BN.prototype.add = function add (num) {
	    var res;
	    if (num.negative !== 0 && this.negative === 0) {
	      num.negative = 0;
	      res = this.sub(num);
	      num.negative ^= 1;
	      return res;
	    } else if (num.negative === 0 && this.negative !== 0) {
	      this.negative = 0;
	      res = num.sub(this);
	      this.negative = 1;
	      return res;
	    }

	    if (this.length > num.length) return this.clone().iadd(num);

	    return num.clone().iadd(this);
	  };

	  // Subtract `num` from `this` in-place
	  BN.prototype.isub = function isub (num) {
	    // this - (-num) = this + num
	    if (num.negative !== 0) {
	      num.negative = 0;
	      var r = this.iadd(num);
	      num.negative = 1;
	      return r._normSign();

	    // -this - num = -(this + num)
	    } else if (this.negative !== 0) {
	      this.negative = 0;
	      this.iadd(num);
	      this.negative = 1;
	      return this._normSign();
	    }

	    // At this point both numbers are positive
	    var cmp = this.cmp(num);

	    // Optimization - zeroify
	    if (cmp === 0) {
	      this.negative = 0;
	      this.length = 1;
	      this.words[0] = 0;
	      return this;
	    }

	    // a > b
	    var a, b;
	    if (cmp > 0) {
	      a = this;
	      b = num;
	    } else {
	      a = num;
	      b = this;
	    }

	    var carry = 0;
	    for (var i = 0; i < b.length; i++) {
	      r = (a.words[i] | 0) - (b.words[i] | 0) + carry;
	      carry = r >> 26;
	      this.words[i] = r & 0x3ffffff;
	    }
	    for (; carry !== 0 && i < a.length; i++) {
	      r = (a.words[i] | 0) + carry;
	      carry = r >> 26;
	      this.words[i] = r & 0x3ffffff;
	    }

	    // Copy rest of the words
	    if (carry === 0 && i < a.length && a !== this) {
	      for (; i < a.length; i++) {
	        this.words[i] = a.words[i];
	      }
	    }

	    this.length = Math.max(this.length, i);

	    if (a !== this) {
	      this.negative = 1;
	    }

	    return this.strip();
	  };

	  // Subtract `num` from `this`
	  BN.prototype.sub = function sub (num) {
	    return this.clone().isub(num);
	  };

	  function smallMulTo (self, num, out) {
	    out.negative = num.negative ^ self.negative;
	    var len = (self.length + num.length) | 0;
	    out.length = len;
	    len = (len - 1) | 0;

	    // Peel one iteration (compiler can't do it, because of code complexity)
	    var a = self.words[0] | 0;
	    var b = num.words[0] | 0;
	    var r = a * b;

	    var lo = r & 0x3ffffff;
	    var carry = (r / 0x4000000) | 0;
	    out.words[0] = lo;

	    for (var k = 1; k < len; k++) {
	      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
	      // note that ncarry could be >= 0x3ffffff
	      var ncarry = carry >>> 26;
	      var rword = carry & 0x3ffffff;
	      var maxJ = Math.min(k, num.length - 1);
	      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
	        var i = (k - j) | 0;
	        a = self.words[i] | 0;
	        b = num.words[j] | 0;
	        r = a * b + rword;
	        ncarry += (r / 0x4000000) | 0;
	        rword = r & 0x3ffffff;
	      }
	      out.words[k] = rword | 0;
	      carry = ncarry | 0;
	    }
	    if (carry !== 0) {
	      out.words[k] = carry | 0;
	    } else {
	      out.length--;
	    }

	    return out.strip();
	  }

	  // TODO(indutny): it may be reasonable to omit it for users who don't need
	  // to work with 256-bit numbers, otherwise it gives 20% improvement for 256-bit
	  // multiplication (like elliptic secp256k1).
	  var comb10MulTo = function comb10MulTo (self, num, out) {
	    var a = self.words;
	    var b = num.words;
	    var o = out.words;
	    var c = 0;
	    var lo;
	    var mid;
	    var hi;
	    var a0 = a[0] | 0;
	    var al0 = a0 & 0x1fff;
	    var ah0 = a0 >>> 13;
	    var a1 = a[1] | 0;
	    var al1 = a1 & 0x1fff;
	    var ah1 = a1 >>> 13;
	    var a2 = a[2] | 0;
	    var al2 = a2 & 0x1fff;
	    var ah2 = a2 >>> 13;
	    var a3 = a[3] | 0;
	    var al3 = a3 & 0x1fff;
	    var ah3 = a3 >>> 13;
	    var a4 = a[4] | 0;
	    var al4 = a4 & 0x1fff;
	    var ah4 = a4 >>> 13;
	    var a5 = a[5] | 0;
	    var al5 = a5 & 0x1fff;
	    var ah5 = a5 >>> 13;
	    var a6 = a[6] | 0;
	    var al6 = a6 & 0x1fff;
	    var ah6 = a6 >>> 13;
	    var a7 = a[7] | 0;
	    var al7 = a7 & 0x1fff;
	    var ah7 = a7 >>> 13;
	    var a8 = a[8] | 0;
	    var al8 = a8 & 0x1fff;
	    var ah8 = a8 >>> 13;
	    var a9 = a[9] | 0;
	    var al9 = a9 & 0x1fff;
	    var ah9 = a9 >>> 13;
	    var b0 = b[0] | 0;
	    var bl0 = b0 & 0x1fff;
	    var bh0 = b0 >>> 13;
	    var b1 = b[1] | 0;
	    var bl1 = b1 & 0x1fff;
	    var bh1 = b1 >>> 13;
	    var b2 = b[2] | 0;
	    var bl2 = b2 & 0x1fff;
	    var bh2 = b2 >>> 13;
	    var b3 = b[3] | 0;
	    var bl3 = b3 & 0x1fff;
	    var bh3 = b3 >>> 13;
	    var b4 = b[4] | 0;
	    var bl4 = b4 & 0x1fff;
	    var bh4 = b4 >>> 13;
	    var b5 = b[5] | 0;
	    var bl5 = b5 & 0x1fff;
	    var bh5 = b5 >>> 13;
	    var b6 = b[6] | 0;
	    var bl6 = b6 & 0x1fff;
	    var bh6 = b6 >>> 13;
	    var b7 = b[7] | 0;
	    var bl7 = b7 & 0x1fff;
	    var bh7 = b7 >>> 13;
	    var b8 = b[8] | 0;
	    var bl8 = b8 & 0x1fff;
	    var bh8 = b8 >>> 13;
	    var b9 = b[9] | 0;
	    var bl9 = b9 & 0x1fff;
	    var bh9 = b9 >>> 13;

	    out.negative = self.negative ^ num.negative;
	    out.length = 19;
	    /* k = 0 */
	    lo = Math.imul(al0, bl0);
	    mid = Math.imul(al0, bh0);
	    mid = (mid + Math.imul(ah0, bl0)) | 0;
	    hi = Math.imul(ah0, bh0);
	    var w0 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w0 >>> 26)) | 0;
	    w0 &= 0x3ffffff;
	    /* k = 1 */
	    lo = Math.imul(al1, bl0);
	    mid = Math.imul(al1, bh0);
	    mid = (mid + Math.imul(ah1, bl0)) | 0;
	    hi = Math.imul(ah1, bh0);
	    lo = (lo + Math.imul(al0, bl1)) | 0;
	    mid = (mid + Math.imul(al0, bh1)) | 0;
	    mid = (mid + Math.imul(ah0, bl1)) | 0;
	    hi = (hi + Math.imul(ah0, bh1)) | 0;
	    var w1 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w1 >>> 26)) | 0;
	    w1 &= 0x3ffffff;
	    /* k = 2 */
	    lo = Math.imul(al2, bl0);
	    mid = Math.imul(al2, bh0);
	    mid = (mid + Math.imul(ah2, bl0)) | 0;
	    hi = Math.imul(ah2, bh0);
	    lo = (lo + Math.imul(al1, bl1)) | 0;
	    mid = (mid + Math.imul(al1, bh1)) | 0;
	    mid = (mid + Math.imul(ah1, bl1)) | 0;
	    hi = (hi + Math.imul(ah1, bh1)) | 0;
	    lo = (lo + Math.imul(al0, bl2)) | 0;
	    mid = (mid + Math.imul(al0, bh2)) | 0;
	    mid = (mid + Math.imul(ah0, bl2)) | 0;
	    hi = (hi + Math.imul(ah0, bh2)) | 0;
	    var w2 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w2 >>> 26)) | 0;
	    w2 &= 0x3ffffff;
	    /* k = 3 */
	    lo = Math.imul(al3, bl0);
	    mid = Math.imul(al3, bh0);
	    mid = (mid + Math.imul(ah3, bl0)) | 0;
	    hi = Math.imul(ah3, bh0);
	    lo = (lo + Math.imul(al2, bl1)) | 0;
	    mid = (mid + Math.imul(al2, bh1)) | 0;
	    mid = (mid + Math.imul(ah2, bl1)) | 0;
	    hi = (hi + Math.imul(ah2, bh1)) | 0;
	    lo = (lo + Math.imul(al1, bl2)) | 0;
	    mid = (mid + Math.imul(al1, bh2)) | 0;
	    mid = (mid + Math.imul(ah1, bl2)) | 0;
	    hi = (hi + Math.imul(ah1, bh2)) | 0;
	    lo = (lo + Math.imul(al0, bl3)) | 0;
	    mid = (mid + Math.imul(al0, bh3)) | 0;
	    mid = (mid + Math.imul(ah0, bl3)) | 0;
	    hi = (hi + Math.imul(ah0, bh3)) | 0;
	    var w3 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w3 >>> 26)) | 0;
	    w3 &= 0x3ffffff;
	    /* k = 4 */
	    lo = Math.imul(al4, bl0);
	    mid = Math.imul(al4, bh0);
	    mid = (mid + Math.imul(ah4, bl0)) | 0;
	    hi = Math.imul(ah4, bh0);
	    lo = (lo + Math.imul(al3, bl1)) | 0;
	    mid = (mid + Math.imul(al3, bh1)) | 0;
	    mid = (mid + Math.imul(ah3, bl1)) | 0;
	    hi = (hi + Math.imul(ah3, bh1)) | 0;
	    lo = (lo + Math.imul(al2, bl2)) | 0;
	    mid = (mid + Math.imul(al2, bh2)) | 0;
	    mid = (mid + Math.imul(ah2, bl2)) | 0;
	    hi = (hi + Math.imul(ah2, bh2)) | 0;
	    lo = (lo + Math.imul(al1, bl3)) | 0;
	    mid = (mid + Math.imul(al1, bh3)) | 0;
	    mid = (mid + Math.imul(ah1, bl3)) | 0;
	    hi = (hi + Math.imul(ah1, bh3)) | 0;
	    lo = (lo + Math.imul(al0, bl4)) | 0;
	    mid = (mid + Math.imul(al0, bh4)) | 0;
	    mid = (mid + Math.imul(ah0, bl4)) | 0;
	    hi = (hi + Math.imul(ah0, bh4)) | 0;
	    var w4 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w4 >>> 26)) | 0;
	    w4 &= 0x3ffffff;
	    /* k = 5 */
	    lo = Math.imul(al5, bl0);
	    mid = Math.imul(al5, bh0);
	    mid = (mid + Math.imul(ah5, bl0)) | 0;
	    hi = Math.imul(ah5, bh0);
	    lo = (lo + Math.imul(al4, bl1)) | 0;
	    mid = (mid + Math.imul(al4, bh1)) | 0;
	    mid = (mid + Math.imul(ah4, bl1)) | 0;
	    hi = (hi + Math.imul(ah4, bh1)) | 0;
	    lo = (lo + Math.imul(al3, bl2)) | 0;
	    mid = (mid + Math.imul(al3, bh2)) | 0;
	    mid = (mid + Math.imul(ah3, bl2)) | 0;
	    hi = (hi + Math.imul(ah3, bh2)) | 0;
	    lo = (lo + Math.imul(al2, bl3)) | 0;
	    mid = (mid + Math.imul(al2, bh3)) | 0;
	    mid = (mid + Math.imul(ah2, bl3)) | 0;
	    hi = (hi + Math.imul(ah2, bh3)) | 0;
	    lo = (lo + Math.imul(al1, bl4)) | 0;
	    mid = (mid + Math.imul(al1, bh4)) | 0;
	    mid = (mid + Math.imul(ah1, bl4)) | 0;
	    hi = (hi + Math.imul(ah1, bh4)) | 0;
	    lo = (lo + Math.imul(al0, bl5)) | 0;
	    mid = (mid + Math.imul(al0, bh5)) | 0;
	    mid = (mid + Math.imul(ah0, bl5)) | 0;
	    hi = (hi + Math.imul(ah0, bh5)) | 0;
	    var w5 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w5 >>> 26)) | 0;
	    w5 &= 0x3ffffff;
	    /* k = 6 */
	    lo = Math.imul(al6, bl0);
	    mid = Math.imul(al6, bh0);
	    mid = (mid + Math.imul(ah6, bl0)) | 0;
	    hi = Math.imul(ah6, bh0);
	    lo = (lo + Math.imul(al5, bl1)) | 0;
	    mid = (mid + Math.imul(al5, bh1)) | 0;
	    mid = (mid + Math.imul(ah5, bl1)) | 0;
	    hi = (hi + Math.imul(ah5, bh1)) | 0;
	    lo = (lo + Math.imul(al4, bl2)) | 0;
	    mid = (mid + Math.imul(al4, bh2)) | 0;
	    mid = (mid + Math.imul(ah4, bl2)) | 0;
	    hi = (hi + Math.imul(ah4, bh2)) | 0;
	    lo = (lo + Math.imul(al3, bl3)) | 0;
	    mid = (mid + Math.imul(al3, bh3)) | 0;
	    mid = (mid + Math.imul(ah3, bl3)) | 0;
	    hi = (hi + Math.imul(ah3, bh3)) | 0;
	    lo = (lo + Math.imul(al2, bl4)) | 0;
	    mid = (mid + Math.imul(al2, bh4)) | 0;
	    mid = (mid + Math.imul(ah2, bl4)) | 0;
	    hi = (hi + Math.imul(ah2, bh4)) | 0;
	    lo = (lo + Math.imul(al1, bl5)) | 0;
	    mid = (mid + Math.imul(al1, bh5)) | 0;
	    mid = (mid + Math.imul(ah1, bl5)) | 0;
	    hi = (hi + Math.imul(ah1, bh5)) | 0;
	    lo = (lo + Math.imul(al0, bl6)) | 0;
	    mid = (mid + Math.imul(al0, bh6)) | 0;
	    mid = (mid + Math.imul(ah0, bl6)) | 0;
	    hi = (hi + Math.imul(ah0, bh6)) | 0;
	    var w6 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w6 >>> 26)) | 0;
	    w6 &= 0x3ffffff;
	    /* k = 7 */
	    lo = Math.imul(al7, bl0);
	    mid = Math.imul(al7, bh0);
	    mid = (mid + Math.imul(ah7, bl0)) | 0;
	    hi = Math.imul(ah7, bh0);
	    lo = (lo + Math.imul(al6, bl1)) | 0;
	    mid = (mid + Math.imul(al6, bh1)) | 0;
	    mid = (mid + Math.imul(ah6, bl1)) | 0;
	    hi = (hi + Math.imul(ah6, bh1)) | 0;
	    lo = (lo + Math.imul(al5, bl2)) | 0;
	    mid = (mid + Math.imul(al5, bh2)) | 0;
	    mid = (mid + Math.imul(ah5, bl2)) | 0;
	    hi = (hi + Math.imul(ah5, bh2)) | 0;
	    lo = (lo + Math.imul(al4, bl3)) | 0;
	    mid = (mid + Math.imul(al4, bh3)) | 0;
	    mid = (mid + Math.imul(ah4, bl3)) | 0;
	    hi = (hi + Math.imul(ah4, bh3)) | 0;
	    lo = (lo + Math.imul(al3, bl4)) | 0;
	    mid = (mid + Math.imul(al3, bh4)) | 0;
	    mid = (mid + Math.imul(ah3, bl4)) | 0;
	    hi = (hi + Math.imul(ah3, bh4)) | 0;
	    lo = (lo + Math.imul(al2, bl5)) | 0;
	    mid = (mid + Math.imul(al2, bh5)) | 0;
	    mid = (mid + Math.imul(ah2, bl5)) | 0;
	    hi = (hi + Math.imul(ah2, bh5)) | 0;
	    lo = (lo + Math.imul(al1, bl6)) | 0;
	    mid = (mid + Math.imul(al1, bh6)) | 0;
	    mid = (mid + Math.imul(ah1, bl6)) | 0;
	    hi = (hi + Math.imul(ah1, bh6)) | 0;
	    lo = (lo + Math.imul(al0, bl7)) | 0;
	    mid = (mid + Math.imul(al0, bh7)) | 0;
	    mid = (mid + Math.imul(ah0, bl7)) | 0;
	    hi = (hi + Math.imul(ah0, bh7)) | 0;
	    var w7 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w7 >>> 26)) | 0;
	    w7 &= 0x3ffffff;
	    /* k = 8 */
	    lo = Math.imul(al8, bl0);
	    mid = Math.imul(al8, bh0);
	    mid = (mid + Math.imul(ah8, bl0)) | 0;
	    hi = Math.imul(ah8, bh0);
	    lo = (lo + Math.imul(al7, bl1)) | 0;
	    mid = (mid + Math.imul(al7, bh1)) | 0;
	    mid = (mid + Math.imul(ah7, bl1)) | 0;
	    hi = (hi + Math.imul(ah7, bh1)) | 0;
	    lo = (lo + Math.imul(al6, bl2)) | 0;
	    mid = (mid + Math.imul(al6, bh2)) | 0;
	    mid = (mid + Math.imul(ah6, bl2)) | 0;
	    hi = (hi + Math.imul(ah6, bh2)) | 0;
	    lo = (lo + Math.imul(al5, bl3)) | 0;
	    mid = (mid + Math.imul(al5, bh3)) | 0;
	    mid = (mid + Math.imul(ah5, bl3)) | 0;
	    hi = (hi + Math.imul(ah5, bh3)) | 0;
	    lo = (lo + Math.imul(al4, bl4)) | 0;
	    mid = (mid + Math.imul(al4, bh4)) | 0;
	    mid = (mid + Math.imul(ah4, bl4)) | 0;
	    hi = (hi + Math.imul(ah4, bh4)) | 0;
	    lo = (lo + Math.imul(al3, bl5)) | 0;
	    mid = (mid + Math.imul(al3, bh5)) | 0;
	    mid = (mid + Math.imul(ah3, bl5)) | 0;
	    hi = (hi + Math.imul(ah3, bh5)) | 0;
	    lo = (lo + Math.imul(al2, bl6)) | 0;
	    mid = (mid + Math.imul(al2, bh6)) | 0;
	    mid = (mid + Math.imul(ah2, bl6)) | 0;
	    hi = (hi + Math.imul(ah2, bh6)) | 0;
	    lo = (lo + Math.imul(al1, bl7)) | 0;
	    mid = (mid + Math.imul(al1, bh7)) | 0;
	    mid = (mid + Math.imul(ah1, bl7)) | 0;
	    hi = (hi + Math.imul(ah1, bh7)) | 0;
	    lo = (lo + Math.imul(al0, bl8)) | 0;
	    mid = (mid + Math.imul(al0, bh8)) | 0;
	    mid = (mid + Math.imul(ah0, bl8)) | 0;
	    hi = (hi + Math.imul(ah0, bh8)) | 0;
	    var w8 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w8 >>> 26)) | 0;
	    w8 &= 0x3ffffff;
	    /* k = 9 */
	    lo = Math.imul(al9, bl0);
	    mid = Math.imul(al9, bh0);
	    mid = (mid + Math.imul(ah9, bl0)) | 0;
	    hi = Math.imul(ah9, bh0);
	    lo = (lo + Math.imul(al8, bl1)) | 0;
	    mid = (mid + Math.imul(al8, bh1)) | 0;
	    mid = (mid + Math.imul(ah8, bl1)) | 0;
	    hi = (hi + Math.imul(ah8, bh1)) | 0;
	    lo = (lo + Math.imul(al7, bl2)) | 0;
	    mid = (mid + Math.imul(al7, bh2)) | 0;
	    mid = (mid + Math.imul(ah7, bl2)) | 0;
	    hi = (hi + Math.imul(ah7, bh2)) | 0;
	    lo = (lo + Math.imul(al6, bl3)) | 0;
	    mid = (mid + Math.imul(al6, bh3)) | 0;
	    mid = (mid + Math.imul(ah6, bl3)) | 0;
	    hi = (hi + Math.imul(ah6, bh3)) | 0;
	    lo = (lo + Math.imul(al5, bl4)) | 0;
	    mid = (mid + Math.imul(al5, bh4)) | 0;
	    mid = (mid + Math.imul(ah5, bl4)) | 0;
	    hi = (hi + Math.imul(ah5, bh4)) | 0;
	    lo = (lo + Math.imul(al4, bl5)) | 0;
	    mid = (mid + Math.imul(al4, bh5)) | 0;
	    mid = (mid + Math.imul(ah4, bl5)) | 0;
	    hi = (hi + Math.imul(ah4, bh5)) | 0;
	    lo = (lo + Math.imul(al3, bl6)) | 0;
	    mid = (mid + Math.imul(al3, bh6)) | 0;
	    mid = (mid + Math.imul(ah3, bl6)) | 0;
	    hi = (hi + Math.imul(ah3, bh6)) | 0;
	    lo = (lo + Math.imul(al2, bl7)) | 0;
	    mid = (mid + Math.imul(al2, bh7)) | 0;
	    mid = (mid + Math.imul(ah2, bl7)) | 0;
	    hi = (hi + Math.imul(ah2, bh7)) | 0;
	    lo = (lo + Math.imul(al1, bl8)) | 0;
	    mid = (mid + Math.imul(al1, bh8)) | 0;
	    mid = (mid + Math.imul(ah1, bl8)) | 0;
	    hi = (hi + Math.imul(ah1, bh8)) | 0;
	    lo = (lo + Math.imul(al0, bl9)) | 0;
	    mid = (mid + Math.imul(al0, bh9)) | 0;
	    mid = (mid + Math.imul(ah0, bl9)) | 0;
	    hi = (hi + Math.imul(ah0, bh9)) | 0;
	    var w9 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w9 >>> 26)) | 0;
	    w9 &= 0x3ffffff;
	    /* k = 10 */
	    lo = Math.imul(al9, bl1);
	    mid = Math.imul(al9, bh1);
	    mid = (mid + Math.imul(ah9, bl1)) | 0;
	    hi = Math.imul(ah9, bh1);
	    lo = (lo + Math.imul(al8, bl2)) | 0;
	    mid = (mid + Math.imul(al8, bh2)) | 0;
	    mid = (mid + Math.imul(ah8, bl2)) | 0;
	    hi = (hi + Math.imul(ah8, bh2)) | 0;
	    lo = (lo + Math.imul(al7, bl3)) | 0;
	    mid = (mid + Math.imul(al7, bh3)) | 0;
	    mid = (mid + Math.imul(ah7, bl3)) | 0;
	    hi = (hi + Math.imul(ah7, bh3)) | 0;
	    lo = (lo + Math.imul(al6, bl4)) | 0;
	    mid = (mid + Math.imul(al6, bh4)) | 0;
	    mid = (mid + Math.imul(ah6, bl4)) | 0;
	    hi = (hi + Math.imul(ah6, bh4)) | 0;
	    lo = (lo + Math.imul(al5, bl5)) | 0;
	    mid = (mid + Math.imul(al5, bh5)) | 0;
	    mid = (mid + Math.imul(ah5, bl5)) | 0;
	    hi = (hi + Math.imul(ah5, bh5)) | 0;
	    lo = (lo + Math.imul(al4, bl6)) | 0;
	    mid = (mid + Math.imul(al4, bh6)) | 0;
	    mid = (mid + Math.imul(ah4, bl6)) | 0;
	    hi = (hi + Math.imul(ah4, bh6)) | 0;
	    lo = (lo + Math.imul(al3, bl7)) | 0;
	    mid = (mid + Math.imul(al3, bh7)) | 0;
	    mid = (mid + Math.imul(ah3, bl7)) | 0;
	    hi = (hi + Math.imul(ah3, bh7)) | 0;
	    lo = (lo + Math.imul(al2, bl8)) | 0;
	    mid = (mid + Math.imul(al2, bh8)) | 0;
	    mid = (mid + Math.imul(ah2, bl8)) | 0;
	    hi = (hi + Math.imul(ah2, bh8)) | 0;
	    lo = (lo + Math.imul(al1, bl9)) | 0;
	    mid = (mid + Math.imul(al1, bh9)) | 0;
	    mid = (mid + Math.imul(ah1, bl9)) | 0;
	    hi = (hi + Math.imul(ah1, bh9)) | 0;
	    var w10 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w10 >>> 26)) | 0;
	    w10 &= 0x3ffffff;
	    /* k = 11 */
	    lo = Math.imul(al9, bl2);
	    mid = Math.imul(al9, bh2);
	    mid = (mid + Math.imul(ah9, bl2)) | 0;
	    hi = Math.imul(ah9, bh2);
	    lo = (lo + Math.imul(al8, bl3)) | 0;
	    mid = (mid + Math.imul(al8, bh3)) | 0;
	    mid = (mid + Math.imul(ah8, bl3)) | 0;
	    hi = (hi + Math.imul(ah8, bh3)) | 0;
	    lo = (lo + Math.imul(al7, bl4)) | 0;
	    mid = (mid + Math.imul(al7, bh4)) | 0;
	    mid = (mid + Math.imul(ah7, bl4)) | 0;
	    hi = (hi + Math.imul(ah7, bh4)) | 0;
	    lo = (lo + Math.imul(al6, bl5)) | 0;
	    mid = (mid + Math.imul(al6, bh5)) | 0;
	    mid = (mid + Math.imul(ah6, bl5)) | 0;
	    hi = (hi + Math.imul(ah6, bh5)) | 0;
	    lo = (lo + Math.imul(al5, bl6)) | 0;
	    mid = (mid + Math.imul(al5, bh6)) | 0;
	    mid = (mid + Math.imul(ah5, bl6)) | 0;
	    hi = (hi + Math.imul(ah5, bh6)) | 0;
	    lo = (lo + Math.imul(al4, bl7)) | 0;
	    mid = (mid + Math.imul(al4, bh7)) | 0;
	    mid = (mid + Math.imul(ah4, bl7)) | 0;
	    hi = (hi + Math.imul(ah4, bh7)) | 0;
	    lo = (lo + Math.imul(al3, bl8)) | 0;
	    mid = (mid + Math.imul(al3, bh8)) | 0;
	    mid = (mid + Math.imul(ah3, bl8)) | 0;
	    hi = (hi + Math.imul(ah3, bh8)) | 0;
	    lo = (lo + Math.imul(al2, bl9)) | 0;
	    mid = (mid + Math.imul(al2, bh9)) | 0;
	    mid = (mid + Math.imul(ah2, bl9)) | 0;
	    hi = (hi + Math.imul(ah2, bh9)) | 0;
	    var w11 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w11 >>> 26)) | 0;
	    w11 &= 0x3ffffff;
	    /* k = 12 */
	    lo = Math.imul(al9, bl3);
	    mid = Math.imul(al9, bh3);
	    mid = (mid + Math.imul(ah9, bl3)) | 0;
	    hi = Math.imul(ah9, bh3);
	    lo = (lo + Math.imul(al8, bl4)) | 0;
	    mid = (mid + Math.imul(al8, bh4)) | 0;
	    mid = (mid + Math.imul(ah8, bl4)) | 0;
	    hi = (hi + Math.imul(ah8, bh4)) | 0;
	    lo = (lo + Math.imul(al7, bl5)) | 0;
	    mid = (mid + Math.imul(al7, bh5)) | 0;
	    mid = (mid + Math.imul(ah7, bl5)) | 0;
	    hi = (hi + Math.imul(ah7, bh5)) | 0;
	    lo = (lo + Math.imul(al6, bl6)) | 0;
	    mid = (mid + Math.imul(al6, bh6)) | 0;
	    mid = (mid + Math.imul(ah6, bl6)) | 0;
	    hi = (hi + Math.imul(ah6, bh6)) | 0;
	    lo = (lo + Math.imul(al5, bl7)) | 0;
	    mid = (mid + Math.imul(al5, bh7)) | 0;
	    mid = (mid + Math.imul(ah5, bl7)) | 0;
	    hi = (hi + Math.imul(ah5, bh7)) | 0;
	    lo = (lo + Math.imul(al4, bl8)) | 0;
	    mid = (mid + Math.imul(al4, bh8)) | 0;
	    mid = (mid + Math.imul(ah4, bl8)) | 0;
	    hi = (hi + Math.imul(ah4, bh8)) | 0;
	    lo = (lo + Math.imul(al3, bl9)) | 0;
	    mid = (mid + Math.imul(al3, bh9)) | 0;
	    mid = (mid + Math.imul(ah3, bl9)) | 0;
	    hi = (hi + Math.imul(ah3, bh9)) | 0;
	    var w12 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w12 >>> 26)) | 0;
	    w12 &= 0x3ffffff;
	    /* k = 13 */
	    lo = Math.imul(al9, bl4);
	    mid = Math.imul(al9, bh4);
	    mid = (mid + Math.imul(ah9, bl4)) | 0;
	    hi = Math.imul(ah9, bh4);
	    lo = (lo + Math.imul(al8, bl5)) | 0;
	    mid = (mid + Math.imul(al8, bh5)) | 0;
	    mid = (mid + Math.imul(ah8, bl5)) | 0;
	    hi = (hi + Math.imul(ah8, bh5)) | 0;
	    lo = (lo + Math.imul(al7, bl6)) | 0;
	    mid = (mid + Math.imul(al7, bh6)) | 0;
	    mid = (mid + Math.imul(ah7, bl6)) | 0;
	    hi = (hi + Math.imul(ah7, bh6)) | 0;
	    lo = (lo + Math.imul(al6, bl7)) | 0;
	    mid = (mid + Math.imul(al6, bh7)) | 0;
	    mid = (mid + Math.imul(ah6, bl7)) | 0;
	    hi = (hi + Math.imul(ah6, bh7)) | 0;
	    lo = (lo + Math.imul(al5, bl8)) | 0;
	    mid = (mid + Math.imul(al5, bh8)) | 0;
	    mid = (mid + Math.imul(ah5, bl8)) | 0;
	    hi = (hi + Math.imul(ah5, bh8)) | 0;
	    lo = (lo + Math.imul(al4, bl9)) | 0;
	    mid = (mid + Math.imul(al4, bh9)) | 0;
	    mid = (mid + Math.imul(ah4, bl9)) | 0;
	    hi = (hi + Math.imul(ah4, bh9)) | 0;
	    var w13 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w13 >>> 26)) | 0;
	    w13 &= 0x3ffffff;
	    /* k = 14 */
	    lo = Math.imul(al9, bl5);
	    mid = Math.imul(al9, bh5);
	    mid = (mid + Math.imul(ah9, bl5)) | 0;
	    hi = Math.imul(ah9, bh5);
	    lo = (lo + Math.imul(al8, bl6)) | 0;
	    mid = (mid + Math.imul(al8, bh6)) | 0;
	    mid = (mid + Math.imul(ah8, bl6)) | 0;
	    hi = (hi + Math.imul(ah8, bh6)) | 0;
	    lo = (lo + Math.imul(al7, bl7)) | 0;
	    mid = (mid + Math.imul(al7, bh7)) | 0;
	    mid = (mid + Math.imul(ah7, bl7)) | 0;
	    hi = (hi + Math.imul(ah7, bh7)) | 0;
	    lo = (lo + Math.imul(al6, bl8)) | 0;
	    mid = (mid + Math.imul(al6, bh8)) | 0;
	    mid = (mid + Math.imul(ah6, bl8)) | 0;
	    hi = (hi + Math.imul(ah6, bh8)) | 0;
	    lo = (lo + Math.imul(al5, bl9)) | 0;
	    mid = (mid + Math.imul(al5, bh9)) | 0;
	    mid = (mid + Math.imul(ah5, bl9)) | 0;
	    hi = (hi + Math.imul(ah5, bh9)) | 0;
	    var w14 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w14 >>> 26)) | 0;
	    w14 &= 0x3ffffff;
	    /* k = 15 */
	    lo = Math.imul(al9, bl6);
	    mid = Math.imul(al9, bh6);
	    mid = (mid + Math.imul(ah9, bl6)) | 0;
	    hi = Math.imul(ah9, bh6);
	    lo = (lo + Math.imul(al8, bl7)) | 0;
	    mid = (mid + Math.imul(al8, bh7)) | 0;
	    mid = (mid + Math.imul(ah8, bl7)) | 0;
	    hi = (hi + Math.imul(ah8, bh7)) | 0;
	    lo = (lo + Math.imul(al7, bl8)) | 0;
	    mid = (mid + Math.imul(al7, bh8)) | 0;
	    mid = (mid + Math.imul(ah7, bl8)) | 0;
	    hi = (hi + Math.imul(ah7, bh8)) | 0;
	    lo = (lo + Math.imul(al6, bl9)) | 0;
	    mid = (mid + Math.imul(al6, bh9)) | 0;
	    mid = (mid + Math.imul(ah6, bl9)) | 0;
	    hi = (hi + Math.imul(ah6, bh9)) | 0;
	    var w15 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w15 >>> 26)) | 0;
	    w15 &= 0x3ffffff;
	    /* k = 16 */
	    lo = Math.imul(al9, bl7);
	    mid = Math.imul(al9, bh7);
	    mid = (mid + Math.imul(ah9, bl7)) | 0;
	    hi = Math.imul(ah9, bh7);
	    lo = (lo + Math.imul(al8, bl8)) | 0;
	    mid = (mid + Math.imul(al8, bh8)) | 0;
	    mid = (mid + Math.imul(ah8, bl8)) | 0;
	    hi = (hi + Math.imul(ah8, bh8)) | 0;
	    lo = (lo + Math.imul(al7, bl9)) | 0;
	    mid = (mid + Math.imul(al7, bh9)) | 0;
	    mid = (mid + Math.imul(ah7, bl9)) | 0;
	    hi = (hi + Math.imul(ah7, bh9)) | 0;
	    var w16 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w16 >>> 26)) | 0;
	    w16 &= 0x3ffffff;
	    /* k = 17 */
	    lo = Math.imul(al9, bl8);
	    mid = Math.imul(al9, bh8);
	    mid = (mid + Math.imul(ah9, bl8)) | 0;
	    hi = Math.imul(ah9, bh8);
	    lo = (lo + Math.imul(al8, bl9)) | 0;
	    mid = (mid + Math.imul(al8, bh9)) | 0;
	    mid = (mid + Math.imul(ah8, bl9)) | 0;
	    hi = (hi + Math.imul(ah8, bh9)) | 0;
	    var w17 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w17 >>> 26)) | 0;
	    w17 &= 0x3ffffff;
	    /* k = 18 */
	    lo = Math.imul(al9, bl9);
	    mid = Math.imul(al9, bh9);
	    mid = (mid + Math.imul(ah9, bl9)) | 0;
	    hi = Math.imul(ah9, bh9);
	    var w18 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w18 >>> 26)) | 0;
	    w18 &= 0x3ffffff;
	    o[0] = w0;
	    o[1] = w1;
	    o[2] = w2;
	    o[3] = w3;
	    o[4] = w4;
	    o[5] = w5;
	    o[6] = w6;
	    o[7] = w7;
	    o[8] = w8;
	    o[9] = w9;
	    o[10] = w10;
	    o[11] = w11;
	    o[12] = w12;
	    o[13] = w13;
	    o[14] = w14;
	    o[15] = w15;
	    o[16] = w16;
	    o[17] = w17;
	    o[18] = w18;
	    if (c !== 0) {
	      o[19] = c;
	      out.length++;
	    }
	    return out;
	  };

	  // Polyfill comb
	  if (!Math.imul) {
	    comb10MulTo = smallMulTo;
	  }

	  function bigMulTo (self, num, out) {
	    out.negative = num.negative ^ self.negative;
	    out.length = self.length + num.length;

	    var carry = 0;
	    var hncarry = 0;
	    for (var k = 0; k < out.length - 1; k++) {
	      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
	      // note that ncarry could be >= 0x3ffffff
	      var ncarry = hncarry;
	      hncarry = 0;
	      var rword = carry & 0x3ffffff;
	      var maxJ = Math.min(k, num.length - 1);
	      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
	        var i = k - j;
	        var a = self.words[i] | 0;
	        var b = num.words[j] | 0;
	        var r = a * b;

	        var lo = r & 0x3ffffff;
	        ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
	        lo = (lo + rword) | 0;
	        rword = lo & 0x3ffffff;
	        ncarry = (ncarry + (lo >>> 26)) | 0;

	        hncarry += ncarry >>> 26;
	        ncarry &= 0x3ffffff;
	      }
	      out.words[k] = rword;
	      carry = ncarry;
	      ncarry = hncarry;
	    }
	    if (carry !== 0) {
	      out.words[k] = carry;
	    } else {
	      out.length--;
	    }

	    return out.strip();
	  }

	  function jumboMulTo (self, num, out) {
	    var fftm = new FFTM();
	    return fftm.mulp(self, num, out);
	  }

	  BN.prototype.mulTo = function mulTo (num, out) {
	    var res;
	    var len = this.length + num.length;
	    if (this.length === 10 && num.length === 10) {
	      res = comb10MulTo(this, num, out);
	    } else if (len < 63) {
	      res = smallMulTo(this, num, out);
	    } else if (len < 1024) {
	      res = bigMulTo(this, num, out);
	    } else {
	      res = jumboMulTo(this, num, out);
	    }

	    return res;
	  };

	  // Cooley-Tukey algorithm for FFT
	  // slightly revisited to rely on looping instead of recursion

	  function FFTM (x, y) {
	    this.x = x;
	    this.y = y;
	  }

	  FFTM.prototype.makeRBT = function makeRBT (N) {
	    var t = new Array(N);
	    var l = BN.prototype._countBits(N) - 1;
	    for (var i = 0; i < N; i++) {
	      t[i] = this.revBin(i, l, N);
	    }

	    return t;
	  };

	  // Returns binary-reversed representation of `x`
	  FFTM.prototype.revBin = function revBin (x, l, N) {
	    if (x === 0 || x === N - 1) return x;

	    var rb = 0;
	    for (var i = 0; i < l; i++) {
	      rb |= (x & 1) << (l - i - 1);
	      x >>= 1;
	    }

	    return rb;
	  };

	  // Performs "tweedling" phase, therefore 'emulating'
	  // behaviour of the recursive algorithm
	  FFTM.prototype.permute = function permute (rbt, rws, iws, rtws, itws, N) {
	    for (var i = 0; i < N; i++) {
	      rtws[i] = rws[rbt[i]];
	      itws[i] = iws[rbt[i]];
	    }
	  };

	  FFTM.prototype.transform = function transform (rws, iws, rtws, itws, N, rbt) {
	    this.permute(rbt, rws, iws, rtws, itws, N);

	    for (var s = 1; s < N; s <<= 1) {
	      var l = s << 1;

	      var rtwdf = Math.cos(2 * Math.PI / l);
	      var itwdf = Math.sin(2 * Math.PI / l);

	      for (var p = 0; p < N; p += l) {
	        var rtwdf_ = rtwdf;
	        var itwdf_ = itwdf;

	        for (var j = 0; j < s; j++) {
	          var re = rtws[p + j];
	          var ie = itws[p + j];

	          var ro = rtws[p + j + s];
	          var io = itws[p + j + s];

	          var rx = rtwdf_ * ro - itwdf_ * io;

	          io = rtwdf_ * io + itwdf_ * ro;
	          ro = rx;

	          rtws[p + j] = re + ro;
	          itws[p + j] = ie + io;

	          rtws[p + j + s] = re - ro;
	          itws[p + j + s] = ie - io;

	          /* jshint maxdepth : false */
	          if (j !== l) {
	            rx = rtwdf * rtwdf_ - itwdf * itwdf_;

	            itwdf_ = rtwdf * itwdf_ + itwdf * rtwdf_;
	            rtwdf_ = rx;
	          }
	        }
	      }
	    }
	  };

	  FFTM.prototype.guessLen13b = function guessLen13b (n, m) {
	    var N = Math.max(m, n) | 1;
	    var odd = N & 1;
	    var i = 0;
	    for (N = N / 2 | 0; N; N = N >>> 1) {
	      i++;
	    }

	    return 1 << i + 1 + odd;
	  };

	  FFTM.prototype.conjugate = function conjugate (rws, iws, N) {
	    if (N <= 1) return;

	    for (var i = 0; i < N / 2; i++) {
	      var t = rws[i];

	      rws[i] = rws[N - i - 1];
	      rws[N - i - 1] = t;

	      t = iws[i];

	      iws[i] = -iws[N - i - 1];
	      iws[N - i - 1] = -t;
	    }
	  };

	  FFTM.prototype.normalize13b = function normalize13b (ws, N) {
	    var carry = 0;
	    for (var i = 0; i < N / 2; i++) {
	      var w = Math.round(ws[2 * i + 1] / N) * 0x2000 +
	        Math.round(ws[2 * i] / N) +
	        carry;

	      ws[i] = w & 0x3ffffff;

	      if (w < 0x4000000) {
	        carry = 0;
	      } else {
	        carry = w / 0x4000000 | 0;
	      }
	    }

	    return ws;
	  };

	  FFTM.prototype.convert13b = function convert13b (ws, len, rws, N) {
	    var carry = 0;
	    for (var i = 0; i < len; i++) {
	      carry = carry + (ws[i] | 0);

	      rws[2 * i] = carry & 0x1fff; carry = carry >>> 13;
	      rws[2 * i + 1] = carry & 0x1fff; carry = carry >>> 13;
	    }

	    // Pad with zeroes
	    for (i = 2 * len; i < N; ++i) {
	      rws[i] = 0;
	    }

	    assert(carry === 0);
	    assert((carry & ~0x1fff) === 0);
	  };

	  FFTM.prototype.stub = function stub (N) {
	    var ph = new Array(N);
	    for (var i = 0; i < N; i++) {
	      ph[i] = 0;
	    }

	    return ph;
	  };

	  FFTM.prototype.mulp = function mulp (x, y, out) {
	    var N = 2 * this.guessLen13b(x.length, y.length);

	    var rbt = this.makeRBT(N);

	    var _ = this.stub(N);

	    var rws = new Array(N);
	    var rwst = new Array(N);
	    var iwst = new Array(N);

	    var nrws = new Array(N);
	    var nrwst = new Array(N);
	    var niwst = new Array(N);

	    var rmws = out.words;
	    rmws.length = N;

	    this.convert13b(x.words, x.length, rws, N);
	    this.convert13b(y.words, y.length, nrws, N);

	    this.transform(rws, _, rwst, iwst, N, rbt);
	    this.transform(nrws, _, nrwst, niwst, N, rbt);

	    for (var i = 0; i < N; i++) {
	      var rx = rwst[i] * nrwst[i] - iwst[i] * niwst[i];
	      iwst[i] = rwst[i] * niwst[i] + iwst[i] * nrwst[i];
	      rwst[i] = rx;
	    }

	    this.conjugate(rwst, iwst, N);
	    this.transform(rwst, iwst, rmws, _, N, rbt);
	    this.conjugate(rmws, _, N);
	    this.normalize13b(rmws, N);

	    out.negative = x.negative ^ y.negative;
	    out.length = x.length + y.length;
	    return out.strip();
	  };

	  // Multiply `this` by `num`
	  BN.prototype.mul = function mul (num) {
	    var out = new BN(null);
	    out.words = new Array(this.length + num.length);
	    return this.mulTo(num, out);
	  };

	  // Multiply employing FFT
	  BN.prototype.mulf = function mulf (num) {
	    var out = new BN(null);
	    out.words = new Array(this.length + num.length);
	    return jumboMulTo(this, num, out);
	  };

	  // In-place Multiplication
	  BN.prototype.imul = function imul (num) {
	    return this.clone().mulTo(num, this);
	  };

	  BN.prototype.imuln = function imuln (num) {
	    assert(typeof num === 'number');
	    assert(num < 0x4000000);

	    // Carry
	    var carry = 0;
	    for (var i = 0; i < this.length; i++) {
	      var w = (this.words[i] | 0) * num;
	      var lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
	      carry >>= 26;
	      carry += (w / 0x4000000) | 0;
	      // NOTE: lo is 27bit maximum
	      carry += lo >>> 26;
	      this.words[i] = lo & 0x3ffffff;
	    }

	    if (carry !== 0) {
	      this.words[i] = carry;
	      this.length++;
	    }

	    return this;
	  };

	  BN.prototype.muln = function muln (num) {
	    return this.clone().imuln(num);
	  };

	  // `this` * `this`
	  BN.prototype.sqr = function sqr () {
	    return this.mul(this);
	  };

	  // `this` * `this` in-place
	  BN.prototype.isqr = function isqr () {
	    return this.imul(this.clone());
	  };

	  // Math.pow(`this`, `num`)
	  BN.prototype.pow = function pow (num) {
	    var w = toBitArray(num);
	    if (w.length === 0) return new BN(1);

	    // Skip leading zeroes
	    var res = this;
	    for (var i = 0; i < w.length; i++, res = res.sqr()) {
	      if (w[i] !== 0) break;
	    }

	    if (++i < w.length) {
	      for (var q = res.sqr(); i < w.length; i++, q = q.sqr()) {
	        if (w[i] === 0) continue;

	        res = res.mul(q);
	      }
	    }

	    return res;
	  };

	  // Shift-left in-place
	  BN.prototype.iushln = function iushln (bits) {
	    assert(typeof bits === 'number' && bits >= 0);
	    var r = bits % 26;
	    var s = (bits - r) / 26;
	    var carryMask = (0x3ffffff >>> (26 - r)) << (26 - r);
	    var i;

	    if (r !== 0) {
	      var carry = 0;

	      for (i = 0; i < this.length; i++) {
	        var newCarry = this.words[i] & carryMask;
	        var c = ((this.words[i] | 0) - newCarry) << r;
	        this.words[i] = c | carry;
	        carry = newCarry >>> (26 - r);
	      }

	      if (carry) {
	        this.words[i] = carry;
	        this.length++;
	      }
	    }

	    if (s !== 0) {
	      for (i = this.length - 1; i >= 0; i--) {
	        this.words[i + s] = this.words[i];
	      }

	      for (i = 0; i < s; i++) {
	        this.words[i] = 0;
	      }

	      this.length += s;
	    }

	    return this.strip();
	  };

	  BN.prototype.ishln = function ishln (bits) {
	    // TODO(indutny): implement me
	    assert(this.negative === 0);
	    return this.iushln(bits);
	  };

	  // Shift-right in-place
	  // NOTE: `hint` is a lowest bit before trailing zeroes
	  // NOTE: if `extended` is present - it will be filled with destroyed bits
	  BN.prototype.iushrn = function iushrn (bits, hint, extended) {
	    assert(typeof bits === 'number' && bits >= 0);
	    var h;
	    if (hint) {
	      h = (hint - (hint % 26)) / 26;
	    } else {
	      h = 0;
	    }

	    var r = bits % 26;
	    var s = Math.min((bits - r) / 26, this.length);
	    var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
	    var maskedWords = extended;

	    h -= s;
	    h = Math.max(0, h);

	    // Extended mode, copy masked part
	    if (maskedWords) {
	      for (var i = 0; i < s; i++) {
	        maskedWords.words[i] = this.words[i];
	      }
	      maskedWords.length = s;
	    }

	    if (s === 0) ; else if (this.length > s) {
	      this.length -= s;
	      for (i = 0; i < this.length; i++) {
	        this.words[i] = this.words[i + s];
	      }
	    } else {
	      this.words[0] = 0;
	      this.length = 1;
	    }

	    var carry = 0;
	    for (i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
	      var word = this.words[i] | 0;
	      this.words[i] = (carry << (26 - r)) | (word >>> r);
	      carry = word & mask;
	    }

	    // Push carried bits as a mask
	    if (maskedWords && carry !== 0) {
	      maskedWords.words[maskedWords.length++] = carry;
	    }

	    if (this.length === 0) {
	      this.words[0] = 0;
	      this.length = 1;
	    }

	    return this.strip();
	  };

	  BN.prototype.ishrn = function ishrn (bits, hint, extended) {
	    // TODO(indutny): implement me
	    assert(this.negative === 0);
	    return this.iushrn(bits, hint, extended);
	  };

	  // Shift-left
	  BN.prototype.shln = function shln (bits) {
	    return this.clone().ishln(bits);
	  };

	  BN.prototype.ushln = function ushln (bits) {
	    return this.clone().iushln(bits);
	  };

	  // Shift-right
	  BN.prototype.shrn = function shrn (bits) {
	    return this.clone().ishrn(bits);
	  };

	  BN.prototype.ushrn = function ushrn (bits) {
	    return this.clone().iushrn(bits);
	  };

	  // Test if n bit is set
	  BN.prototype.testn = function testn (bit) {
	    assert(typeof bit === 'number' && bit >= 0);
	    var r = bit % 26;
	    var s = (bit - r) / 26;
	    var q = 1 << r;

	    // Fast case: bit is much higher than all existing words
	    if (this.length <= s) return false;

	    // Check bit and return
	    var w = this.words[s];

	    return !!(w & q);
	  };

	  // Return only lowers bits of number (in-place)
	  BN.prototype.imaskn = function imaskn (bits) {
	    assert(typeof bits === 'number' && bits >= 0);
	    var r = bits % 26;
	    var s = (bits - r) / 26;

	    assert(this.negative === 0, 'imaskn works only with positive numbers');

	    if (this.length <= s) {
	      return this;
	    }

	    if (r !== 0) {
	      s++;
	    }
	    this.length = Math.min(s, this.length);

	    if (r !== 0) {
	      var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
	      this.words[this.length - 1] &= mask;
	    }

	    return this.strip();
	  };

	  // Return only lowers bits of number
	  BN.prototype.maskn = function maskn (bits) {
	    return this.clone().imaskn(bits);
	  };

	  // Add plain number `num` to `this`
	  BN.prototype.iaddn = function iaddn (num) {
	    assert(typeof num === 'number');
	    assert(num < 0x4000000);
	    if (num < 0) return this.isubn(-num);

	    // Possible sign change
	    if (this.negative !== 0) {
	      if (this.length === 1 && (this.words[0] | 0) < num) {
	        this.words[0] = num - (this.words[0] | 0);
	        this.negative = 0;
	        return this;
	      }

	      this.negative = 0;
	      this.isubn(num);
	      this.negative = 1;
	      return this;
	    }

	    // Add without checks
	    return this._iaddn(num);
	  };

	  BN.prototype._iaddn = function _iaddn (num) {
	    this.words[0] += num;

	    // Carry
	    for (var i = 0; i < this.length && this.words[i] >= 0x4000000; i++) {
	      this.words[i] -= 0x4000000;
	      if (i === this.length - 1) {
	        this.words[i + 1] = 1;
	      } else {
	        this.words[i + 1]++;
	      }
	    }
	    this.length = Math.max(this.length, i + 1);

	    return this;
	  };

	  // Subtract plain number `num` from `this`
	  BN.prototype.isubn = function isubn (num) {
	    assert(typeof num === 'number');
	    assert(num < 0x4000000);
	    if (num < 0) return this.iaddn(-num);

	    if (this.negative !== 0) {
	      this.negative = 0;
	      this.iaddn(num);
	      this.negative = 1;
	      return this;
	    }

	    this.words[0] -= num;

	    if (this.length === 1 && this.words[0] < 0) {
	      this.words[0] = -this.words[0];
	      this.negative = 1;
	    } else {
	      // Carry
	      for (var i = 0; i < this.length && this.words[i] < 0; i++) {
	        this.words[i] += 0x4000000;
	        this.words[i + 1] -= 1;
	      }
	    }

	    return this.strip();
	  };

	  BN.prototype.addn = function addn (num) {
	    return this.clone().iaddn(num);
	  };

	  BN.prototype.subn = function subn (num) {
	    return this.clone().isubn(num);
	  };

	  BN.prototype.iabs = function iabs () {
	    this.negative = 0;

	    return this;
	  };

	  BN.prototype.abs = function abs () {
	    return this.clone().iabs();
	  };

	  BN.prototype._ishlnsubmul = function _ishlnsubmul (num, mul, shift) {
	    var len = num.length + shift;
	    var i;

	    this._expand(len);

	    var w;
	    var carry = 0;
	    for (i = 0; i < num.length; i++) {
	      w = (this.words[i + shift] | 0) + carry;
	      var right = (num.words[i] | 0) * mul;
	      w -= right & 0x3ffffff;
	      carry = (w >> 26) - ((right / 0x4000000) | 0);
	      this.words[i + shift] = w & 0x3ffffff;
	    }
	    for (; i < this.length - shift; i++) {
	      w = (this.words[i + shift] | 0) + carry;
	      carry = w >> 26;
	      this.words[i + shift] = w & 0x3ffffff;
	    }

	    if (carry === 0) return this.strip();

	    // Subtraction overflow
	    assert(carry === -1);
	    carry = 0;
	    for (i = 0; i < this.length; i++) {
	      w = -(this.words[i] | 0) + carry;
	      carry = w >> 26;
	      this.words[i] = w & 0x3ffffff;
	    }
	    this.negative = 1;

	    return this.strip();
	  };

	  BN.prototype._wordDiv = function _wordDiv (num, mode) {
	    var shift = this.length - num.length;

	    var a = this.clone();
	    var b = num;

	    // Normalize
	    var bhi = b.words[b.length - 1] | 0;
	    var bhiBits = this._countBits(bhi);
	    shift = 26 - bhiBits;
	    if (shift !== 0) {
	      b = b.ushln(shift);
	      a.iushln(shift);
	      bhi = b.words[b.length - 1] | 0;
	    }

	    // Initialize quotient
	    var m = a.length - b.length;
	    var q;

	    if (mode !== 'mod') {
	      q = new BN(null);
	      q.length = m + 1;
	      q.words = new Array(q.length);
	      for (var i = 0; i < q.length; i++) {
	        q.words[i] = 0;
	      }
	    }

	    var diff = a.clone()._ishlnsubmul(b, 1, m);
	    if (diff.negative === 0) {
	      a = diff;
	      if (q) {
	        q.words[m] = 1;
	      }
	    }

	    for (var j = m - 1; j >= 0; j--) {
	      var qj = (a.words[b.length + j] | 0) * 0x4000000 +
	        (a.words[b.length + j - 1] | 0);

	      // NOTE: (qj / bhi) is (0x3ffffff * 0x4000000 + 0x3ffffff) / 0x2000000 max
	      // (0x7ffffff)
	      qj = Math.min((qj / bhi) | 0, 0x3ffffff);

	      a._ishlnsubmul(b, qj, j);
	      while (a.negative !== 0) {
	        qj--;
	        a.negative = 0;
	        a._ishlnsubmul(b, 1, j);
	        if (!a.isZero()) {
	          a.negative ^= 1;
	        }
	      }
	      if (q) {
	        q.words[j] = qj;
	      }
	    }
	    if (q) {
	      q.strip();
	    }
	    a.strip();

	    // Denormalize
	    if (mode !== 'div' && shift !== 0) {
	      a.iushrn(shift);
	    }

	    return {
	      div: q || null,
	      mod: a
	    };
	  };

	  // NOTE: 1) `mode` can be set to `mod` to request mod only,
	  //       to `div` to request div only, or be absent to
	  //       request both div & mod
	  //       2) `positive` is true if unsigned mod is requested
	  BN.prototype.divmod = function divmod (num, mode, positive) {
	    assert(!num.isZero());

	    if (this.isZero()) {
	      return {
	        div: new BN(0),
	        mod: new BN(0)
	      };
	    }

	    var div, mod, res;
	    if (this.negative !== 0 && num.negative === 0) {
	      res = this.neg().divmod(num, mode);

	      if (mode !== 'mod') {
	        div = res.div.neg();
	      }

	      if (mode !== 'div') {
	        mod = res.mod.neg();
	        if (positive && mod.negative !== 0) {
	          mod.iadd(num);
	        }
	      }

	      return {
	        div: div,
	        mod: mod
	      };
	    }

	    if (this.negative === 0 && num.negative !== 0) {
	      res = this.divmod(num.neg(), mode);

	      if (mode !== 'mod') {
	        div = res.div.neg();
	      }

	      return {
	        div: div,
	        mod: res.mod
	      };
	    }

	    if ((this.negative & num.negative) !== 0) {
	      res = this.neg().divmod(num.neg(), mode);

	      if (mode !== 'div') {
	        mod = res.mod.neg();
	        if (positive && mod.negative !== 0) {
	          mod.isub(num);
	        }
	      }

	      return {
	        div: res.div,
	        mod: mod
	      };
	    }

	    // Both numbers are positive at this point

	    // Strip both numbers to approximate shift value
	    if (num.length > this.length || this.cmp(num) < 0) {
	      return {
	        div: new BN(0),
	        mod: this
	      };
	    }

	    // Very short reduction
	    if (num.length === 1) {
	      if (mode === 'div') {
	        return {
	          div: this.divn(num.words[0]),
	          mod: null
	        };
	      }

	      if (mode === 'mod') {
	        return {
	          div: null,
	          mod: new BN(this.modn(num.words[0]))
	        };
	      }

	      return {
	        div: this.divn(num.words[0]),
	        mod: new BN(this.modn(num.words[0]))
	      };
	    }

	    return this._wordDiv(num, mode);
	  };

	  // Find `this` / `num`
	  BN.prototype.div = function div (num) {
	    return this.divmod(num, 'div', false).div;
	  };

	  // Find `this` % `num`
	  BN.prototype.mod = function mod (num) {
	    return this.divmod(num, 'mod', false).mod;
	  };

	  BN.prototype.umod = function umod (num) {
	    return this.divmod(num, 'mod', true).mod;
	  };

	  // Find Round(`this` / `num`)
	  BN.prototype.divRound = function divRound (num) {
	    var dm = this.divmod(num);

	    // Fast case - exact division
	    if (dm.mod.isZero()) return dm.div;

	    var mod = dm.div.negative !== 0 ? dm.mod.isub(num) : dm.mod;

	    var half = num.ushrn(1);
	    var r2 = num.andln(1);
	    var cmp = mod.cmp(half);

	    // Round down
	    if (cmp < 0 || r2 === 1 && cmp === 0) return dm.div;

	    // Round up
	    return dm.div.negative !== 0 ? dm.div.isubn(1) : dm.div.iaddn(1);
	  };

	  BN.prototype.modn = function modn (num) {
	    assert(num <= 0x3ffffff);
	    var p = (1 << 26) % num;

	    var acc = 0;
	    for (var i = this.length - 1; i >= 0; i--) {
	      acc = (p * acc + (this.words[i] | 0)) % num;
	    }

	    return acc;
	  };

	  // In-place division by number
	  BN.prototype.idivn = function idivn (num) {
	    assert(num <= 0x3ffffff);

	    var carry = 0;
	    for (var i = this.length - 1; i >= 0; i--) {
	      var w = (this.words[i] | 0) + carry * 0x4000000;
	      this.words[i] = (w / num) | 0;
	      carry = w % num;
	    }

	    return this.strip();
	  };

	  BN.prototype.divn = function divn (num) {
	    return this.clone().idivn(num);
	  };

	  BN.prototype.egcd = function egcd (p) {
	    assert(p.negative === 0);
	    assert(!p.isZero());

	    var x = this;
	    var y = p.clone();

	    if (x.negative !== 0) {
	      x = x.umod(p);
	    } else {
	      x = x.clone();
	    }

	    // A * x + B * y = x
	    var A = new BN(1);
	    var B = new BN(0);

	    // C * x + D * y = y
	    var C = new BN(0);
	    var D = new BN(1);

	    var g = 0;

	    while (x.isEven() && y.isEven()) {
	      x.iushrn(1);
	      y.iushrn(1);
	      ++g;
	    }

	    var yp = y.clone();
	    var xp = x.clone();

	    while (!x.isZero()) {
	      for (var i = 0, im = 1; (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
	      if (i > 0) {
	        x.iushrn(i);
	        while (i-- > 0) {
	          if (A.isOdd() || B.isOdd()) {
	            A.iadd(yp);
	            B.isub(xp);
	          }

	          A.iushrn(1);
	          B.iushrn(1);
	        }
	      }

	      for (var j = 0, jm = 1; (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
	      if (j > 0) {
	        y.iushrn(j);
	        while (j-- > 0) {
	          if (C.isOdd() || D.isOdd()) {
	            C.iadd(yp);
	            D.isub(xp);
	          }

	          C.iushrn(1);
	          D.iushrn(1);
	        }
	      }

	      if (x.cmp(y) >= 0) {
	        x.isub(y);
	        A.isub(C);
	        B.isub(D);
	      } else {
	        y.isub(x);
	        C.isub(A);
	        D.isub(B);
	      }
	    }

	    return {
	      a: C,
	      b: D,
	      gcd: y.iushln(g)
	    };
	  };

	  // This is reduced incarnation of the binary EEA
	  // above, designated to invert members of the
	  // _prime_ fields F(p) at a maximal speed
	  BN.prototype._invmp = function _invmp (p) {
	    assert(p.negative === 0);
	    assert(!p.isZero());

	    var a = this;
	    var b = p.clone();

	    if (a.negative !== 0) {
	      a = a.umod(p);
	    } else {
	      a = a.clone();
	    }

	    var x1 = new BN(1);
	    var x2 = new BN(0);

	    var delta = b.clone();

	    while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
	      for (var i = 0, im = 1; (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
	      if (i > 0) {
	        a.iushrn(i);
	        while (i-- > 0) {
	          if (x1.isOdd()) {
	            x1.iadd(delta);
	          }

	          x1.iushrn(1);
	        }
	      }

	      for (var j = 0, jm = 1; (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
	      if (j > 0) {
	        b.iushrn(j);
	        while (j-- > 0) {
	          if (x2.isOdd()) {
	            x2.iadd(delta);
	          }

	          x2.iushrn(1);
	        }
	      }

	      if (a.cmp(b) >= 0) {
	        a.isub(b);
	        x1.isub(x2);
	      } else {
	        b.isub(a);
	        x2.isub(x1);
	      }
	    }

	    var res;
	    if (a.cmpn(1) === 0) {
	      res = x1;
	    } else {
	      res = x2;
	    }

	    if (res.cmpn(0) < 0) {
	      res.iadd(p);
	    }

	    return res;
	  };

	  BN.prototype.gcd = function gcd (num) {
	    if (this.isZero()) return num.abs();
	    if (num.isZero()) return this.abs();

	    var a = this.clone();
	    var b = num.clone();
	    a.negative = 0;
	    b.negative = 0;

	    // Remove common factor of two
	    for (var shift = 0; a.isEven() && b.isEven(); shift++) {
	      a.iushrn(1);
	      b.iushrn(1);
	    }

	    do {
	      while (a.isEven()) {
	        a.iushrn(1);
	      }
	      while (b.isEven()) {
	        b.iushrn(1);
	      }

	      var r = a.cmp(b);
	      if (r < 0) {
	        // Swap `a` and `b` to make `a` always bigger than `b`
	        var t = a;
	        a = b;
	        b = t;
	      } else if (r === 0 || b.cmpn(1) === 0) {
	        break;
	      }

	      a.isub(b);
	    } while (true);

	    return b.iushln(shift);
	  };

	  // Invert number in the field F(num)
	  BN.prototype.invm = function invm (num) {
	    return this.egcd(num).a.umod(num);
	  };

	  BN.prototype.isEven = function isEven () {
	    return (this.words[0] & 1) === 0;
	  };

	  BN.prototype.isOdd = function isOdd () {
	    return (this.words[0] & 1) === 1;
	  };

	  // And first word and num
	  BN.prototype.andln = function andln (num) {
	    return this.words[0] & num;
	  };

	  // Increment at the bit position in-line
	  BN.prototype.bincn = function bincn (bit) {
	    assert(typeof bit === 'number');
	    var r = bit % 26;
	    var s = (bit - r) / 26;
	    var q = 1 << r;

	    // Fast case: bit is much higher than all existing words
	    if (this.length <= s) {
	      this._expand(s + 1);
	      this.words[s] |= q;
	      return this;
	    }

	    // Add bit and propagate, if needed
	    var carry = q;
	    for (var i = s; carry !== 0 && i < this.length; i++) {
	      var w = this.words[i] | 0;
	      w += carry;
	      carry = w >>> 26;
	      w &= 0x3ffffff;
	      this.words[i] = w;
	    }
	    if (carry !== 0) {
	      this.words[i] = carry;
	      this.length++;
	    }
	    return this;
	  };

	  BN.prototype.isZero = function isZero () {
	    return this.length === 1 && this.words[0] === 0;
	  };

	  BN.prototype.cmpn = function cmpn (num) {
	    var negative = num < 0;

	    if (this.negative !== 0 && !negative) return -1;
	    if (this.negative === 0 && negative) return 1;

	    this.strip();

	    var res;
	    if (this.length > 1) {
	      res = 1;
	    } else {
	      if (negative) {
	        num = -num;
	      }

	      assert(num <= 0x3ffffff, 'Number is too big');

	      var w = this.words[0] | 0;
	      res = w === num ? 0 : w < num ? -1 : 1;
	    }
	    if (this.negative !== 0) return -res | 0;
	    return res;
	  };

	  // Compare two numbers and return:
	  // 1 - if `this` > `num`
	  // 0 - if `this` == `num`
	  // -1 - if `this` < `num`
	  BN.prototype.cmp = function cmp (num) {
	    if (this.negative !== 0 && num.negative === 0) return -1;
	    if (this.negative === 0 && num.negative !== 0) return 1;

	    var res = this.ucmp(num);
	    if (this.negative !== 0) return -res | 0;
	    return res;
	  };

	  // Unsigned comparison
	  BN.prototype.ucmp = function ucmp (num) {
	    // At this point both numbers have the same sign
	    if (this.length > num.length) return 1;
	    if (this.length < num.length) return -1;

	    var res = 0;
	    for (var i = this.length - 1; i >= 0; i--) {
	      var a = this.words[i] | 0;
	      var b = num.words[i] | 0;

	      if (a === b) continue;
	      if (a < b) {
	        res = -1;
	      } else if (a > b) {
	        res = 1;
	      }
	      break;
	    }
	    return res;
	  };

	  BN.prototype.gtn = function gtn (num) {
	    return this.cmpn(num) === 1;
	  };

	  BN.prototype.gt = function gt (num) {
	    return this.cmp(num) === 1;
	  };

	  BN.prototype.gten = function gten (num) {
	    return this.cmpn(num) >= 0;
	  };

	  BN.prototype.gte = function gte (num) {
	    return this.cmp(num) >= 0;
	  };

	  BN.prototype.ltn = function ltn (num) {
	    return this.cmpn(num) === -1;
	  };

	  BN.prototype.lt = function lt (num) {
	    return this.cmp(num) === -1;
	  };

	  BN.prototype.lten = function lten (num) {
	    return this.cmpn(num) <= 0;
	  };

	  BN.prototype.lte = function lte (num) {
	    return this.cmp(num) <= 0;
	  };

	  BN.prototype.eqn = function eqn (num) {
	    return this.cmpn(num) === 0;
	  };

	  BN.prototype.eq = function eq (num) {
	    return this.cmp(num) === 0;
	  };

	  //
	  // A reduce context, could be using montgomery or something better, depending
	  // on the `m` itself.
	  //
	  BN.red = function red (num) {
	    return new Red(num);
	  };

	  BN.prototype.toRed = function toRed (ctx) {
	    assert(!this.red, 'Already a number in reduction context');
	    assert(this.negative === 0, 'red works only with positives');
	    return ctx.convertTo(this)._forceRed(ctx);
	  };

	  BN.prototype.fromRed = function fromRed () {
	    assert(this.red, 'fromRed works only with numbers in reduction context');
	    return this.red.convertFrom(this);
	  };

	  BN.prototype._forceRed = function _forceRed (ctx) {
	    this.red = ctx;
	    return this;
	  };

	  BN.prototype.forceRed = function forceRed (ctx) {
	    assert(!this.red, 'Already a number in reduction context');
	    return this._forceRed(ctx);
	  };

	  BN.prototype.redAdd = function redAdd (num) {
	    assert(this.red, 'redAdd works only with red numbers');
	    return this.red.add(this, num);
	  };

	  BN.prototype.redIAdd = function redIAdd (num) {
	    assert(this.red, 'redIAdd works only with red numbers');
	    return this.red.iadd(this, num);
	  };

	  BN.prototype.redSub = function redSub (num) {
	    assert(this.red, 'redSub works only with red numbers');
	    return this.red.sub(this, num);
	  };

	  BN.prototype.redISub = function redISub (num) {
	    assert(this.red, 'redISub works only with red numbers');
	    return this.red.isub(this, num);
	  };

	  BN.prototype.redShl = function redShl (num) {
	    assert(this.red, 'redShl works only with red numbers');
	    return this.red.shl(this, num);
	  };

	  BN.prototype.redMul = function redMul (num) {
	    assert(this.red, 'redMul works only with red numbers');
	    this.red._verify2(this, num);
	    return this.red.mul(this, num);
	  };

	  BN.prototype.redIMul = function redIMul (num) {
	    assert(this.red, 'redMul works only with red numbers');
	    this.red._verify2(this, num);
	    return this.red.imul(this, num);
	  };

	  BN.prototype.redSqr = function redSqr () {
	    assert(this.red, 'redSqr works only with red numbers');
	    this.red._verify1(this);
	    return this.red.sqr(this);
	  };

	  BN.prototype.redISqr = function redISqr () {
	    assert(this.red, 'redISqr works only with red numbers');
	    this.red._verify1(this);
	    return this.red.isqr(this);
	  };

	  // Square root over p
	  BN.prototype.redSqrt = function redSqrt () {
	    assert(this.red, 'redSqrt works only with red numbers');
	    this.red._verify1(this);
	    return this.red.sqrt(this);
	  };

	  BN.prototype.redInvm = function redInvm () {
	    assert(this.red, 'redInvm works only with red numbers');
	    this.red._verify1(this);
	    return this.red.invm(this);
	  };

	  // Return negative clone of `this` % `red modulo`
	  BN.prototype.redNeg = function redNeg () {
	    assert(this.red, 'redNeg works only with red numbers');
	    this.red._verify1(this);
	    return this.red.neg(this);
	  };

	  BN.prototype.redPow = function redPow (num) {
	    assert(this.red && !num.red, 'redPow(normalNum)');
	    this.red._verify1(this);
	    return this.red.pow(this, num);
	  };

	  // Prime numbers with efficient reduction
	  var primes = {
	    k256: null,
	    p224: null,
	    p192: null,
	    p25519: null
	  };

	  // Pseudo-Mersenne prime
	  function MPrime (name, p) {
	    // P = 2 ^ N - K
	    this.name = name;
	    this.p = new BN(p, 16);
	    this.n = this.p.bitLength();
	    this.k = new BN(1).iushln(this.n).isub(this.p);

	    this.tmp = this._tmp();
	  }

	  MPrime.prototype._tmp = function _tmp () {
	    var tmp = new BN(null);
	    tmp.words = new Array(Math.ceil(this.n / 13));
	    return tmp;
	  };

	  MPrime.prototype.ireduce = function ireduce (num) {
	    // Assumes that `num` is less than `P^2`
	    // num = HI * (2 ^ N - K) + HI * K + LO = HI * K + LO (mod P)
	    var r = num;
	    var rlen;

	    do {
	      this.split(r, this.tmp);
	      r = this.imulK(r);
	      r = r.iadd(this.tmp);
	      rlen = r.bitLength();
	    } while (rlen > this.n);

	    var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
	    if (cmp === 0) {
	      r.words[0] = 0;
	      r.length = 1;
	    } else if (cmp > 0) {
	      r.isub(this.p);
	    } else {
	      r.strip();
	    }

	    return r;
	  };

	  MPrime.prototype.split = function split (input, out) {
	    input.iushrn(this.n, 0, out);
	  };

	  MPrime.prototype.imulK = function imulK (num) {
	    return num.imul(this.k);
	  };

	  function K256 () {
	    MPrime.call(
	      this,
	      'k256',
	      'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f');
	  }
	  inherits(K256, MPrime);

	  K256.prototype.split = function split (input, output) {
	    // 256 = 9 * 26 + 22
	    var mask = 0x3fffff;

	    var outLen = Math.min(input.length, 9);
	    for (var i = 0; i < outLen; i++) {
	      output.words[i] = input.words[i];
	    }
	    output.length = outLen;

	    if (input.length <= 9) {
	      input.words[0] = 0;
	      input.length = 1;
	      return;
	    }

	    // Shift by 9 limbs
	    var prev = input.words[9];
	    output.words[output.length++] = prev & mask;

	    for (i = 10; i < input.length; i++) {
	      var next = input.words[i] | 0;
	      input.words[i - 10] = ((next & mask) << 4) | (prev >>> 22);
	      prev = next;
	    }
	    prev >>>= 22;
	    input.words[i - 10] = prev;
	    if (prev === 0 && input.length > 10) {
	      input.length -= 10;
	    } else {
	      input.length -= 9;
	    }
	  };

	  K256.prototype.imulK = function imulK (num) {
	    // K = 0x1000003d1 = [ 0x40, 0x3d1 ]
	    num.words[num.length] = 0;
	    num.words[num.length + 1] = 0;
	    num.length += 2;

	    // bounded at: 0x40 * 0x3ffffff + 0x3d0 = 0x100000390
	    var lo = 0;
	    for (var i = 0; i < num.length; i++) {
	      var w = num.words[i] | 0;
	      lo += w * 0x3d1;
	      num.words[i] = lo & 0x3ffffff;
	      lo = w * 0x40 + ((lo / 0x4000000) | 0);
	    }

	    // Fast length reduction
	    if (num.words[num.length - 1] === 0) {
	      num.length--;
	      if (num.words[num.length - 1] === 0) {
	        num.length--;
	      }
	    }
	    return num;
	  };

	  function P224 () {
	    MPrime.call(
	      this,
	      'p224',
	      'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001');
	  }
	  inherits(P224, MPrime);

	  function P192 () {
	    MPrime.call(
	      this,
	      'p192',
	      'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff');
	  }
	  inherits(P192, MPrime);

	  function P25519 () {
	    // 2 ^ 255 - 19
	    MPrime.call(
	      this,
	      '25519',
	      '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed');
	  }
	  inherits(P25519, MPrime);

	  P25519.prototype.imulK = function imulK (num) {
	    // K = 0x13
	    var carry = 0;
	    for (var i = 0; i < num.length; i++) {
	      var hi = (num.words[i] | 0) * 0x13 + carry;
	      var lo = hi & 0x3ffffff;
	      hi >>>= 26;

	      num.words[i] = lo;
	      carry = hi;
	    }
	    if (carry !== 0) {
	      num.words[num.length++] = carry;
	    }
	    return num;
	  };

	  // Exported mostly for testing purposes, use plain name instead
	  BN._prime = function prime (name) {
	    // Cached version of prime
	    if (primes[name]) return primes[name];

	    var prime;
	    if (name === 'k256') {
	      prime = new K256();
	    } else if (name === 'p224') {
	      prime = new P224();
	    } else if (name === 'p192') {
	      prime = new P192();
	    } else if (name === 'p25519') {
	      prime = new P25519();
	    } else {
	      throw new Error('Unknown prime ' + name);
	    }
	    primes[name] = prime;

	    return prime;
	  };

	  //
	  // Base reduction engine
	  //
	  function Red (m) {
	    if (typeof m === 'string') {
	      var prime = BN._prime(m);
	      this.m = prime.p;
	      this.prime = prime;
	    } else {
	      assert(m.gtn(1), 'modulus must be greater than 1');
	      this.m = m;
	      this.prime = null;
	    }
	  }

	  Red.prototype._verify1 = function _verify1 (a) {
	    assert(a.negative === 0, 'red works only with positives');
	    assert(a.red, 'red works only with red numbers');
	  };

	  Red.prototype._verify2 = function _verify2 (a, b) {
	    assert((a.negative | b.negative) === 0, 'red works only with positives');
	    assert(a.red && a.red === b.red,
	      'red works only with red numbers');
	  };

	  Red.prototype.imod = function imod (a) {
	    if (this.prime) return this.prime.ireduce(a)._forceRed(this);
	    return a.umod(this.m)._forceRed(this);
	  };

	  Red.prototype.neg = function neg (a) {
	    if (a.isZero()) {
	      return a.clone();
	    }

	    return this.m.sub(a)._forceRed(this);
	  };

	  Red.prototype.add = function add (a, b) {
	    this._verify2(a, b);

	    var res = a.add(b);
	    if (res.cmp(this.m) >= 0) {
	      res.isub(this.m);
	    }
	    return res._forceRed(this);
	  };

	  Red.prototype.iadd = function iadd (a, b) {
	    this._verify2(a, b);

	    var res = a.iadd(b);
	    if (res.cmp(this.m) >= 0) {
	      res.isub(this.m);
	    }
	    return res;
	  };

	  Red.prototype.sub = function sub (a, b) {
	    this._verify2(a, b);

	    var res = a.sub(b);
	    if (res.cmpn(0) < 0) {
	      res.iadd(this.m);
	    }
	    return res._forceRed(this);
	  };

	  Red.prototype.isub = function isub (a, b) {
	    this._verify2(a, b);

	    var res = a.isub(b);
	    if (res.cmpn(0) < 0) {
	      res.iadd(this.m);
	    }
	    return res;
	  };

	  Red.prototype.shl = function shl (a, num) {
	    this._verify1(a);
	    return this.imod(a.ushln(num));
	  };

	  Red.prototype.imul = function imul (a, b) {
	    this._verify2(a, b);
	    return this.imod(a.imul(b));
	  };

	  Red.prototype.mul = function mul (a, b) {
	    this._verify2(a, b);
	    return this.imod(a.mul(b));
	  };

	  Red.prototype.isqr = function isqr (a) {
	    return this.imul(a, a.clone());
	  };

	  Red.prototype.sqr = function sqr (a) {
	    return this.mul(a, a);
	  };

	  Red.prototype.sqrt = function sqrt (a) {
	    if (a.isZero()) return a.clone();

	    var mod3 = this.m.andln(3);
	    assert(mod3 % 2 === 1);

	    // Fast case
	    if (mod3 === 3) {
	      var pow = this.m.add(new BN(1)).iushrn(2);
	      return this.pow(a, pow);
	    }

	    // Tonelli-Shanks algorithm (Totally unoptimized and slow)
	    //
	    // Find Q and S, that Q * 2 ^ S = (P - 1)
	    var q = this.m.subn(1);
	    var s = 0;
	    while (!q.isZero() && q.andln(1) === 0) {
	      s++;
	      q.iushrn(1);
	    }
	    assert(!q.isZero());

	    var one = new BN(1).toRed(this);
	    var nOne = one.redNeg();

	    // Find quadratic non-residue
	    // NOTE: Max is such because of generalized Riemann hypothesis.
	    var lpow = this.m.subn(1).iushrn(1);
	    var z = this.m.bitLength();
	    z = new BN(2 * z * z).toRed(this);

	    while (this.pow(z, lpow).cmp(nOne) !== 0) {
	      z.redIAdd(nOne);
	    }

	    var c = this.pow(z, q);
	    var r = this.pow(a, q.addn(1).iushrn(1));
	    var t = this.pow(a, q);
	    var m = s;
	    while (t.cmp(one) !== 0) {
	      var tmp = t;
	      for (var i = 0; tmp.cmp(one) !== 0; i++) {
	        tmp = tmp.redSqr();
	      }
	      assert(i < m);
	      var b = this.pow(c, new BN(1).iushln(m - i - 1));

	      r = r.redMul(b);
	      c = b.redSqr();
	      t = t.redMul(c);
	      m = i;
	    }

	    return r;
	  };

	  Red.prototype.invm = function invm (a) {
	    var inv = a._invmp(this.m);
	    if (inv.negative !== 0) {
	      inv.negative = 0;
	      return this.imod(inv).redNeg();
	    } else {
	      return this.imod(inv);
	    }
	  };

	  Red.prototype.pow = function pow (a, num) {
	    if (num.isZero()) return new BN(1);
	    if (num.cmpn(1) === 0) return a.clone();

	    var windowSize = 4;
	    var wnd = new Array(1 << windowSize);
	    wnd[0] = new BN(1).toRed(this);
	    wnd[1] = a;
	    for (var i = 2; i < wnd.length; i++) {
	      wnd[i] = this.mul(wnd[i - 1], a);
	    }

	    var res = wnd[0];
	    var current = 0;
	    var currentLen = 0;
	    var start = num.bitLength() % 26;
	    if (start === 0) {
	      start = 26;
	    }

	    for (i = num.length - 1; i >= 0; i--) {
	      var word = num.words[i];
	      for (var j = start - 1; j >= 0; j--) {
	        var bit = (word >> j) & 1;
	        if (res !== wnd[0]) {
	          res = this.sqr(res);
	        }

	        if (bit === 0 && current === 0) {
	          currentLen = 0;
	          continue;
	        }

	        current <<= 1;
	        current |= bit;
	        currentLen++;
	        if (currentLen !== windowSize && (i !== 0 || j !== 0)) continue;

	        res = this.mul(res, wnd[current]);
	        currentLen = 0;
	        current = 0;
	      }
	      start = 26;
	    }

	    return res;
	  };

	  Red.prototype.convertTo = function convertTo (num) {
	    var r = num.umod(this.m);

	    return r === num ? r.clone() : r;
	  };

	  Red.prototype.convertFrom = function convertFrom (num) {
	    var res = num.clone();
	    res.red = null;
	    return res;
	  };

	  //
	  // Montgomery method engine
	  //

	  BN.mont = function mont (num) {
	    return new Mont(num);
	  };

	  function Mont (m) {
	    Red.call(this, m);

	    this.shift = this.m.bitLength();
	    if (this.shift % 26 !== 0) {
	      this.shift += 26 - (this.shift % 26);
	    }

	    this.r = new BN(1).iushln(this.shift);
	    this.r2 = this.imod(this.r.sqr());
	    this.rinv = this.r._invmp(this.m);

	    this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
	    this.minv = this.minv.umod(this.r);
	    this.minv = this.r.sub(this.minv);
	  }
	  inherits(Mont, Red);

	  Mont.prototype.convertTo = function convertTo (num) {
	    return this.imod(num.ushln(this.shift));
	  };

	  Mont.prototype.convertFrom = function convertFrom (num) {
	    var r = this.imod(num.mul(this.rinv));
	    r.red = null;
	    return r;
	  };

	  Mont.prototype.imul = function imul (a, b) {
	    if (a.isZero() || b.isZero()) {
	      a.words[0] = 0;
	      a.length = 1;
	      return a;
	    }

	    var t = a.imul(b);
	    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
	    var u = t.isub(c).iushrn(this.shift);
	    var res = u;

	    if (u.cmp(this.m) >= 0) {
	      res = u.isub(this.m);
	    } else if (u.cmpn(0) < 0) {
	      res = u.iadd(this.m);
	    }

	    return res._forceRed(this);
	  };

	  Mont.prototype.mul = function mul (a, b) {
	    if (a.isZero() || b.isZero()) return new BN(0)._forceRed(this);

	    var t = a.mul(b);
	    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
	    var u = t.isub(c).iushrn(this.shift);
	    var res = u;
	    if (u.cmp(this.m) >= 0) {
	      res = u.isub(this.m);
	    } else if (u.cmpn(0) < 0) {
	      res = u.iadd(this.m);
	    }

	    return res._forceRed(this);
	  };

	  Mont.prototype.invm = function invm (a) {
	    // (AR)^-1 * R^2 = (A^-1 * R^-1) * R^2 = A^-1 * R
	    var res = this.imod(a._invmp(this.m).mul(this.r2));
	    return res._forceRed(this);
	  };
	})(module, commonjsGlobal);
} (bn$2));

var bn$1 = {exports: {}};

(function (module) {
	(function (module, exports) {

	  // Utils
	  function assert (val, msg) {
	    if (!val) throw new Error(msg || 'Assertion failed');
	  }

	  // Could use `inherits` module, but don't want to move from single file
	  // architecture yet.
	  function inherits (ctor, superCtor) {
	    ctor.super_ = superCtor;
	    var TempCtor = function () {};
	    TempCtor.prototype = superCtor.prototype;
	    ctor.prototype = new TempCtor();
	    ctor.prototype.constructor = ctor;
	  }

	  // BN

	  function BN (number, base, endian) {
	    if (BN.isBN(number)) {
	      return number;
	    }

	    this.negative = 0;
	    this.words = null;
	    this.length = 0;

	    // Reduction context
	    this.red = null;

	    if (number !== null) {
	      if (base === 'le' || base === 'be') {
	        endian = base;
	        base = 10;
	      }

	      this._init(number || 0, base || 10, endian || 'be');
	    }
	  }
	  if (typeof module === 'object') {
	    module.exports = BN;
	  } else {
	    exports.BN = BN;
	  }

	  BN.BN = BN;
	  BN.wordSize = 26;

	  var Buffer;
	  try {
	    Buffer = commonjsRequire('buf' + 'fer').Buffer;
	  } catch (e) {
	  }

	  BN.isBN = function isBN (num) {
	    if (num instanceof BN) {
	      return true;
	    }

	    return num !== null && typeof num === 'object' &&
	      num.constructor.wordSize === BN.wordSize && Array.isArray(num.words);
	  };

	  BN.max = function max (left, right) {
	    if (left.cmp(right) > 0) return left;
	    return right;
	  };

	  BN.min = function min (left, right) {
	    if (left.cmp(right) < 0) return left;
	    return right;
	  };

	  BN.prototype._init = function init (number, base, endian) {
	    if (typeof number === 'number') {
	      return this._initNumber(number, base, endian);
	    }

	    if (typeof number === 'object') {
	      return this._initArray(number, base, endian);
	    }

	    if (base === 'hex') {
	      base = 16;
	    }
	    assert(base === (base | 0) && base >= 2 && base <= 36);

	    number = number.toString().replace(/\s+/g, '');
	    var start = 0;
	    if (number[0] === '-') {
	      start++;
	    }

	    if (base === 16) {
	      this._parseHex(number, start);
	    } else {
	      this._parseBase(number, base, start);
	    }

	    if (number[0] === '-') {
	      this.negative = 1;
	    }

	    this.strip();

	    if (endian !== 'le') return;

	    this._initArray(this.toArray(), base, endian);
	  };

	  BN.prototype._initNumber = function _initNumber (number, base, endian) {
	    if (number < 0) {
	      this.negative = 1;
	      number = -number;
	    }
	    if (number < 0x4000000) {
	      this.words = [ number & 0x3ffffff ];
	      this.length = 1;
	    } else if (number < 0x10000000000000) {
	      this.words = [
	        number & 0x3ffffff,
	        (number / 0x4000000) & 0x3ffffff
	      ];
	      this.length = 2;
	    } else {
	      assert(number < 0x20000000000000); // 2 ^ 53 (unsafe)
	      this.words = [
	        number & 0x3ffffff,
	        (number / 0x4000000) & 0x3ffffff,
	        1
	      ];
	      this.length = 3;
	    }

	    if (endian !== 'le') return;

	    // Reverse the bytes
	    this._initArray(this.toArray(), base, endian);
	  };

	  BN.prototype._initArray = function _initArray (number, base, endian) {
	    // Perhaps a Uint8Array
	    assert(typeof number.length === 'number');
	    if (number.length <= 0) {
	      this.words = [ 0 ];
	      this.length = 1;
	      return this;
	    }

	    this.length = Math.ceil(number.length / 3);
	    this.words = new Array(this.length);
	    for (var i = 0; i < this.length; i++) {
	      this.words[i] = 0;
	    }

	    var j, w;
	    var off = 0;
	    if (endian === 'be') {
	      for (i = number.length - 1, j = 0; i >= 0; i -= 3) {
	        w = number[i] | (number[i - 1] << 8) | (number[i - 2] << 16);
	        this.words[j] |= (w << off) & 0x3ffffff;
	        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
	        off += 24;
	        if (off >= 26) {
	          off -= 26;
	          j++;
	        }
	      }
	    } else if (endian === 'le') {
	      for (i = 0, j = 0; i < number.length; i += 3) {
	        w = number[i] | (number[i + 1] << 8) | (number[i + 2] << 16);
	        this.words[j] |= (w << off) & 0x3ffffff;
	        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
	        off += 24;
	        if (off >= 26) {
	          off -= 26;
	          j++;
	        }
	      }
	    }
	    return this.strip();
	  };

	  function parseHex (str, start, end) {
	    var r = 0;
	    var len = Math.min(str.length, end);
	    for (var i = start; i < len; i++) {
	      var c = str.charCodeAt(i) - 48;

	      r <<= 4;

	      // 'a' - 'f'
	      if (c >= 49 && c <= 54) {
	        r |= c - 49 + 0xa;

	      // 'A' - 'F'
	      } else if (c >= 17 && c <= 22) {
	        r |= c - 17 + 0xa;

	      // '0' - '9'
	      } else {
	        r |= c & 0xf;
	      }
	    }
	    return r;
	  }

	  BN.prototype._parseHex = function _parseHex (number, start) {
	    // Create possibly bigger array to ensure that it fits the number
	    this.length = Math.ceil((number.length - start) / 6);
	    this.words = new Array(this.length);
	    for (var i = 0; i < this.length; i++) {
	      this.words[i] = 0;
	    }

	    var j, w;
	    // Scan 24-bit chunks and add them to the number
	    var off = 0;
	    for (i = number.length - 6, j = 0; i >= start; i -= 6) {
	      w = parseHex(number, i, i + 6);
	      this.words[j] |= (w << off) & 0x3ffffff;
	      // NOTE: `0x3fffff` is intentional here, 26bits max shift + 24bit hex limb
	      this.words[j + 1] |= w >>> (26 - off) & 0x3fffff;
	      off += 24;
	      if (off >= 26) {
	        off -= 26;
	        j++;
	      }
	    }
	    if (i + 6 !== start) {
	      w = parseHex(number, start, i + 6);
	      this.words[j] |= (w << off) & 0x3ffffff;
	      this.words[j + 1] |= w >>> (26 - off) & 0x3fffff;
	    }
	    this.strip();
	  };

	  function parseBase (str, start, end, mul) {
	    var r = 0;
	    var len = Math.min(str.length, end);
	    for (var i = start; i < len; i++) {
	      var c = str.charCodeAt(i) - 48;

	      r *= mul;

	      // 'a'
	      if (c >= 49) {
	        r += c - 49 + 0xa;

	      // 'A'
	      } else if (c >= 17) {
	        r += c - 17 + 0xa;

	      // '0' - '9'
	      } else {
	        r += c;
	      }
	    }
	    return r;
	  }

	  BN.prototype._parseBase = function _parseBase (number, base, start) {
	    // Initialize as zero
	    this.words = [ 0 ];
	    this.length = 1;

	    // Find length of limb in base
	    for (var limbLen = 0, limbPow = 1; limbPow <= 0x3ffffff; limbPow *= base) {
	      limbLen++;
	    }
	    limbLen--;
	    limbPow = (limbPow / base) | 0;

	    var total = number.length - start;
	    var mod = total % limbLen;
	    var end = Math.min(total, total - mod) + start;

	    var word = 0;
	    for (var i = start; i < end; i += limbLen) {
	      word = parseBase(number, i, i + limbLen, base);

	      this.imuln(limbPow);
	      if (this.words[0] + word < 0x4000000) {
	        this.words[0] += word;
	      } else {
	        this._iaddn(word);
	      }
	    }

	    if (mod !== 0) {
	      var pow = 1;
	      word = parseBase(number, i, number.length, base);

	      for (i = 0; i < mod; i++) {
	        pow *= base;
	      }

	      this.imuln(pow);
	      if (this.words[0] + word < 0x4000000) {
	        this.words[0] += word;
	      } else {
	        this._iaddn(word);
	      }
	    }
	  };

	  BN.prototype.copy = function copy (dest) {
	    dest.words = new Array(this.length);
	    for (var i = 0; i < this.length; i++) {
	      dest.words[i] = this.words[i];
	    }
	    dest.length = this.length;
	    dest.negative = this.negative;
	    dest.red = this.red;
	  };

	  BN.prototype.clone = function clone () {
	    var r = new BN(null);
	    this.copy(r);
	    return r;
	  };

	  BN.prototype._expand = function _expand (size) {
	    while (this.length < size) {
	      this.words[this.length++] = 0;
	    }
	    return this;
	  };

	  // Remove leading `0` from `this`
	  BN.prototype.strip = function strip () {
	    while (this.length > 1 && this.words[this.length - 1] === 0) {
	      this.length--;
	    }
	    return this._normSign();
	  };

	  BN.prototype._normSign = function _normSign () {
	    // -0 = 0
	    if (this.length === 1 && this.words[0] === 0) {
	      this.negative = 0;
	    }
	    return this;
	  };

	  BN.prototype.inspect = function inspect () {
	    return (this.red ? '<BN-R: ' : '<BN: ') + this.toString(16) + '>';
	  };

	  /*

	  var zeros = [];
	  var groupSizes = [];
	  var groupBases = [];

	  var s = '';
	  var i = -1;
	  while (++i < BN.wordSize) {
	    zeros[i] = s;
	    s += '0';
	  }
	  groupSizes[0] = 0;
	  groupSizes[1] = 0;
	  groupBases[0] = 0;
	  groupBases[1] = 0;
	  var base = 2 - 1;
	  while (++base < 36 + 1) {
	    var groupSize = 0;
	    var groupBase = 1;
	    while (groupBase < (1 << BN.wordSize) / base) {
	      groupBase *= base;
	      groupSize += 1;
	    }
	    groupSizes[base] = groupSize;
	    groupBases[base] = groupBase;
	  }

	  */

	  var zeros = [
	    '',
	    '0',
	    '00',
	    '000',
	    '0000',
	    '00000',
	    '000000',
	    '0000000',
	    '00000000',
	    '000000000',
	    '0000000000',
	    '00000000000',
	    '000000000000',
	    '0000000000000',
	    '00000000000000',
	    '000000000000000',
	    '0000000000000000',
	    '00000000000000000',
	    '000000000000000000',
	    '0000000000000000000',
	    '00000000000000000000',
	    '000000000000000000000',
	    '0000000000000000000000',
	    '00000000000000000000000',
	    '000000000000000000000000',
	    '0000000000000000000000000'
	  ];

	  var groupSizes = [
	    0, 0,
	    25, 16, 12, 11, 10, 9, 8,
	    8, 7, 7, 7, 7, 6, 6,
	    6, 6, 6, 6, 6, 5, 5,
	    5, 5, 5, 5, 5, 5, 5,
	    5, 5, 5, 5, 5, 5, 5
	  ];

	  var groupBases = [
	    0, 0,
	    33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216,
	    43046721, 10000000, 19487171, 35831808, 62748517, 7529536, 11390625,
	    16777216, 24137569, 34012224, 47045881, 64000000, 4084101, 5153632,
	    6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149,
	    24300000, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176
	  ];

	  BN.prototype.toString = function toString (base, padding) {
	    base = base || 10;
	    padding = padding | 0 || 1;

	    var out;
	    if (base === 16 || base === 'hex') {
	      out = '';
	      var off = 0;
	      var carry = 0;
	      for (var i = 0; i < this.length; i++) {
	        var w = this.words[i];
	        var word = (((w << off) | carry) & 0xffffff).toString(16);
	        carry = (w >>> (24 - off)) & 0xffffff;
	        if (carry !== 0 || i !== this.length - 1) {
	          out = zeros[6 - word.length] + word + out;
	        } else {
	          out = word + out;
	        }
	        off += 2;
	        if (off >= 26) {
	          off -= 26;
	          i--;
	        }
	      }
	      if (carry !== 0) {
	        out = carry.toString(16) + out;
	      }
	      while (out.length % padding !== 0) {
	        out = '0' + out;
	      }
	      if (this.negative !== 0) {
	        out = '-' + out;
	      }
	      return out;
	    }

	    if (base === (base | 0) && base >= 2 && base <= 36) {
	      // var groupSize = Math.floor(BN.wordSize * Math.LN2 / Math.log(base));
	      var groupSize = groupSizes[base];
	      // var groupBase = Math.pow(base, groupSize);
	      var groupBase = groupBases[base];
	      out = '';
	      var c = this.clone();
	      c.negative = 0;
	      while (!c.isZero()) {
	        var r = c.modn(groupBase).toString(base);
	        c = c.idivn(groupBase);

	        if (!c.isZero()) {
	          out = zeros[groupSize - r.length] + r + out;
	        } else {
	          out = r + out;
	        }
	      }
	      if (this.isZero()) {
	        out = '0' + out;
	      }
	      while (out.length % padding !== 0) {
	        out = '0' + out;
	      }
	      if (this.negative !== 0) {
	        out = '-' + out;
	      }
	      return out;
	    }

	    assert(false, 'Base should be between 2 and 36');
	  };

	  BN.prototype.toNumber = function toNumber () {
	    var ret = this.words[0];
	    if (this.length === 2) {
	      ret += this.words[1] * 0x4000000;
	    } else if (this.length === 3 && this.words[2] === 0x01) {
	      // NOTE: at this stage it is known that the top bit is set
	      ret += 0x10000000000000 + (this.words[1] * 0x4000000);
	    } else if (this.length > 2) {
	      assert(false, 'Number can only safely store up to 53 bits');
	    }
	    return (this.negative !== 0) ? -ret : ret;
	  };

	  BN.prototype.toJSON = function toJSON () {
	    return this.toString(16);
	  };

	  BN.prototype.toBuffer = function toBuffer (endian, length) {
	    assert(typeof Buffer !== 'undefined');
	    return this.toArrayLike(Buffer, endian, length);
	  };

	  BN.prototype.toArray = function toArray (endian, length) {
	    return this.toArrayLike(Array, endian, length);
	  };

	  BN.prototype.toArrayLike = function toArrayLike (ArrayType, endian, length) {
	    var byteLength = this.byteLength();
	    var reqLength = length || Math.max(1, byteLength);
	    assert(byteLength <= reqLength, 'byte array longer than desired length');
	    assert(reqLength > 0, 'Requested array length <= 0');

	    this.strip();
	    var littleEndian = endian === 'le';
	    var res = new ArrayType(reqLength);

	    var b, i;
	    var q = this.clone();
	    if (!littleEndian) {
	      // Assume big-endian
	      for (i = 0; i < reqLength - byteLength; i++) {
	        res[i] = 0;
	      }

	      for (i = 0; !q.isZero(); i++) {
	        b = q.andln(0xff);
	        q.iushrn(8);

	        res[reqLength - i - 1] = b;
	      }
	    } else {
	      for (i = 0; !q.isZero(); i++) {
	        b = q.andln(0xff);
	        q.iushrn(8);

	        res[i] = b;
	      }

	      for (; i < reqLength; i++) {
	        res[i] = 0;
	      }
	    }

	    return res;
	  };

	  if (Math.clz32) {
	    BN.prototype._countBits = function _countBits (w) {
	      return 32 - Math.clz32(w);
	    };
	  } else {
	    BN.prototype._countBits = function _countBits (w) {
	      var t = w;
	      var r = 0;
	      if (t >= 0x1000) {
	        r += 13;
	        t >>>= 13;
	      }
	      if (t >= 0x40) {
	        r += 7;
	        t >>>= 7;
	      }
	      if (t >= 0x8) {
	        r += 4;
	        t >>>= 4;
	      }
	      if (t >= 0x02) {
	        r += 2;
	        t >>>= 2;
	      }
	      return r + t;
	    };
	  }

	  BN.prototype._zeroBits = function _zeroBits (w) {
	    // Short-cut
	    if (w === 0) return 26;

	    var t = w;
	    var r = 0;
	    if ((t & 0x1fff) === 0) {
	      r += 13;
	      t >>>= 13;
	    }
	    if ((t & 0x7f) === 0) {
	      r += 7;
	      t >>>= 7;
	    }
	    if ((t & 0xf) === 0) {
	      r += 4;
	      t >>>= 4;
	    }
	    if ((t & 0x3) === 0) {
	      r += 2;
	      t >>>= 2;
	    }
	    if ((t & 0x1) === 0) {
	      r++;
	    }
	    return r;
	  };

	  // Return number of used bits in a BN
	  BN.prototype.bitLength = function bitLength () {
	    var w = this.words[this.length - 1];
	    var hi = this._countBits(w);
	    return (this.length - 1) * 26 + hi;
	  };

	  function toBitArray (num) {
	    var w = new Array(num.bitLength());

	    for (var bit = 0; bit < w.length; bit++) {
	      var off = (bit / 26) | 0;
	      var wbit = bit % 26;

	      w[bit] = (num.words[off] & (1 << wbit)) >>> wbit;
	    }

	    return w;
	  }

	  // Number of trailing zero bits
	  BN.prototype.zeroBits = function zeroBits () {
	    if (this.isZero()) return 0;

	    var r = 0;
	    for (var i = 0; i < this.length; i++) {
	      var b = this._zeroBits(this.words[i]);
	      r += b;
	      if (b !== 26) break;
	    }
	    return r;
	  };

	  BN.prototype.byteLength = function byteLength () {
	    return Math.ceil(this.bitLength() / 8);
	  };

	  BN.prototype.toTwos = function toTwos (width) {
	    if (this.negative !== 0) {
	      return this.abs().inotn(width).iaddn(1);
	    }
	    return this.clone();
	  };

	  BN.prototype.fromTwos = function fromTwos (width) {
	    if (this.testn(width - 1)) {
	      return this.notn(width).iaddn(1).ineg();
	    }
	    return this.clone();
	  };

	  BN.prototype.isNeg = function isNeg () {
	    return this.negative !== 0;
	  };

	  // Return negative clone of `this`
	  BN.prototype.neg = function neg () {
	    return this.clone().ineg();
	  };

	  BN.prototype.ineg = function ineg () {
	    if (!this.isZero()) {
	      this.negative ^= 1;
	    }

	    return this;
	  };

	  // Or `num` with `this` in-place
	  BN.prototype.iuor = function iuor (num) {
	    while (this.length < num.length) {
	      this.words[this.length++] = 0;
	    }

	    for (var i = 0; i < num.length; i++) {
	      this.words[i] = this.words[i] | num.words[i];
	    }

	    return this.strip();
	  };

	  BN.prototype.ior = function ior (num) {
	    assert((this.negative | num.negative) === 0);
	    return this.iuor(num);
	  };

	  // Or `num` with `this`
	  BN.prototype.or = function or (num) {
	    if (this.length > num.length) return this.clone().ior(num);
	    return num.clone().ior(this);
	  };

	  BN.prototype.uor = function uor (num) {
	    if (this.length > num.length) return this.clone().iuor(num);
	    return num.clone().iuor(this);
	  };

	  // And `num` with `this` in-place
	  BN.prototype.iuand = function iuand (num) {
	    // b = min-length(num, this)
	    var b;
	    if (this.length > num.length) {
	      b = num;
	    } else {
	      b = this;
	    }

	    for (var i = 0; i < b.length; i++) {
	      this.words[i] = this.words[i] & num.words[i];
	    }

	    this.length = b.length;

	    return this.strip();
	  };

	  BN.prototype.iand = function iand (num) {
	    assert((this.negative | num.negative) === 0);
	    return this.iuand(num);
	  };

	  // And `num` with `this`
	  BN.prototype.and = function and (num) {
	    if (this.length > num.length) return this.clone().iand(num);
	    return num.clone().iand(this);
	  };

	  BN.prototype.uand = function uand (num) {
	    if (this.length > num.length) return this.clone().iuand(num);
	    return num.clone().iuand(this);
	  };

	  // Xor `num` with `this` in-place
	  BN.prototype.iuxor = function iuxor (num) {
	    // a.length > b.length
	    var a;
	    var b;
	    if (this.length > num.length) {
	      a = this;
	      b = num;
	    } else {
	      a = num;
	      b = this;
	    }

	    for (var i = 0; i < b.length; i++) {
	      this.words[i] = a.words[i] ^ b.words[i];
	    }

	    if (this !== a) {
	      for (; i < a.length; i++) {
	        this.words[i] = a.words[i];
	      }
	    }

	    this.length = a.length;

	    return this.strip();
	  };

	  BN.prototype.ixor = function ixor (num) {
	    assert((this.negative | num.negative) === 0);
	    return this.iuxor(num);
	  };

	  // Xor `num` with `this`
	  BN.prototype.xor = function xor (num) {
	    if (this.length > num.length) return this.clone().ixor(num);
	    return num.clone().ixor(this);
	  };

	  BN.prototype.uxor = function uxor (num) {
	    if (this.length > num.length) return this.clone().iuxor(num);
	    return num.clone().iuxor(this);
	  };

	  // Not ``this`` with ``width`` bitwidth
	  BN.prototype.inotn = function inotn (width) {
	    assert(typeof width === 'number' && width >= 0);

	    var bytesNeeded = Math.ceil(width / 26) | 0;
	    var bitsLeft = width % 26;

	    // Extend the buffer with leading zeroes
	    this._expand(bytesNeeded);

	    if (bitsLeft > 0) {
	      bytesNeeded--;
	    }

	    // Handle complete words
	    for (var i = 0; i < bytesNeeded; i++) {
	      this.words[i] = ~this.words[i] & 0x3ffffff;
	    }

	    // Handle the residue
	    if (bitsLeft > 0) {
	      this.words[i] = ~this.words[i] & (0x3ffffff >> (26 - bitsLeft));
	    }

	    // And remove leading zeroes
	    return this.strip();
	  };

	  BN.prototype.notn = function notn (width) {
	    return this.clone().inotn(width);
	  };

	  // Set `bit` of `this`
	  BN.prototype.setn = function setn (bit, val) {
	    assert(typeof bit === 'number' && bit >= 0);

	    var off = (bit / 26) | 0;
	    var wbit = bit % 26;

	    this._expand(off + 1);

	    if (val) {
	      this.words[off] = this.words[off] | (1 << wbit);
	    } else {
	      this.words[off] = this.words[off] & ~(1 << wbit);
	    }

	    return this.strip();
	  };

	  // Add `num` to `this` in-place
	  BN.prototype.iadd = function iadd (num) {
	    var r;

	    // negative + positive
	    if (this.negative !== 0 && num.negative === 0) {
	      this.negative = 0;
	      r = this.isub(num);
	      this.negative ^= 1;
	      return this._normSign();

	    // positive + negative
	    } else if (this.negative === 0 && num.negative !== 0) {
	      num.negative = 0;
	      r = this.isub(num);
	      num.negative = 1;
	      return r._normSign();
	    }

	    // a.length > b.length
	    var a, b;
	    if (this.length > num.length) {
	      a = this;
	      b = num;
	    } else {
	      a = num;
	      b = this;
	    }

	    var carry = 0;
	    for (var i = 0; i < b.length; i++) {
	      r = (a.words[i] | 0) + (b.words[i] | 0) + carry;
	      this.words[i] = r & 0x3ffffff;
	      carry = r >>> 26;
	    }
	    for (; carry !== 0 && i < a.length; i++) {
	      r = (a.words[i] | 0) + carry;
	      this.words[i] = r & 0x3ffffff;
	      carry = r >>> 26;
	    }

	    this.length = a.length;
	    if (carry !== 0) {
	      this.words[this.length] = carry;
	      this.length++;
	    // Copy the rest of the words
	    } else if (a !== this) {
	      for (; i < a.length; i++) {
	        this.words[i] = a.words[i];
	      }
	    }

	    return this;
	  };

	  // Add `num` to `this`
	  BN.prototype.add = function add (num) {
	    var res;
	    if (num.negative !== 0 && this.negative === 0) {
	      num.negative = 0;
	      res = this.sub(num);
	      num.negative ^= 1;
	      return res;
	    } else if (num.negative === 0 && this.negative !== 0) {
	      this.negative = 0;
	      res = num.sub(this);
	      this.negative = 1;
	      return res;
	    }

	    if (this.length > num.length) return this.clone().iadd(num);

	    return num.clone().iadd(this);
	  };

	  // Subtract `num` from `this` in-place
	  BN.prototype.isub = function isub (num) {
	    // this - (-num) = this + num
	    if (num.negative !== 0) {
	      num.negative = 0;
	      var r = this.iadd(num);
	      num.negative = 1;
	      return r._normSign();

	    // -this - num = -(this + num)
	    } else if (this.negative !== 0) {
	      this.negative = 0;
	      this.iadd(num);
	      this.negative = 1;
	      return this._normSign();
	    }

	    // At this point both numbers are positive
	    var cmp = this.cmp(num);

	    // Optimization - zeroify
	    if (cmp === 0) {
	      this.negative = 0;
	      this.length = 1;
	      this.words[0] = 0;
	      return this;
	    }

	    // a > b
	    var a, b;
	    if (cmp > 0) {
	      a = this;
	      b = num;
	    } else {
	      a = num;
	      b = this;
	    }

	    var carry = 0;
	    for (var i = 0; i < b.length; i++) {
	      r = (a.words[i] | 0) - (b.words[i] | 0) + carry;
	      carry = r >> 26;
	      this.words[i] = r & 0x3ffffff;
	    }
	    for (; carry !== 0 && i < a.length; i++) {
	      r = (a.words[i] | 0) + carry;
	      carry = r >> 26;
	      this.words[i] = r & 0x3ffffff;
	    }

	    // Copy rest of the words
	    if (carry === 0 && i < a.length && a !== this) {
	      for (; i < a.length; i++) {
	        this.words[i] = a.words[i];
	      }
	    }

	    this.length = Math.max(this.length, i);

	    if (a !== this) {
	      this.negative = 1;
	    }

	    return this.strip();
	  };

	  // Subtract `num` from `this`
	  BN.prototype.sub = function sub (num) {
	    return this.clone().isub(num);
	  };

	  function smallMulTo (self, num, out) {
	    out.negative = num.negative ^ self.negative;
	    var len = (self.length + num.length) | 0;
	    out.length = len;
	    len = (len - 1) | 0;

	    // Peel one iteration (compiler can't do it, because of code complexity)
	    var a = self.words[0] | 0;
	    var b = num.words[0] | 0;
	    var r = a * b;

	    var lo = r & 0x3ffffff;
	    var carry = (r / 0x4000000) | 0;
	    out.words[0] = lo;

	    for (var k = 1; k < len; k++) {
	      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
	      // note that ncarry could be >= 0x3ffffff
	      var ncarry = carry >>> 26;
	      var rword = carry & 0x3ffffff;
	      var maxJ = Math.min(k, num.length - 1);
	      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
	        var i = (k - j) | 0;
	        a = self.words[i] | 0;
	        b = num.words[j] | 0;
	        r = a * b + rword;
	        ncarry += (r / 0x4000000) | 0;
	        rword = r & 0x3ffffff;
	      }
	      out.words[k] = rword | 0;
	      carry = ncarry | 0;
	    }
	    if (carry !== 0) {
	      out.words[k] = carry | 0;
	    } else {
	      out.length--;
	    }

	    return out.strip();
	  }

	  // TODO(indutny): it may be reasonable to omit it for users who don't need
	  // to work with 256-bit numbers, otherwise it gives 20% improvement for 256-bit
	  // multiplication (like elliptic secp256k1).
	  var comb10MulTo = function comb10MulTo (self, num, out) {
	    var a = self.words;
	    var b = num.words;
	    var o = out.words;
	    var c = 0;
	    var lo;
	    var mid;
	    var hi;
	    var a0 = a[0] | 0;
	    var al0 = a0 & 0x1fff;
	    var ah0 = a0 >>> 13;
	    var a1 = a[1] | 0;
	    var al1 = a1 & 0x1fff;
	    var ah1 = a1 >>> 13;
	    var a2 = a[2] | 0;
	    var al2 = a2 & 0x1fff;
	    var ah2 = a2 >>> 13;
	    var a3 = a[3] | 0;
	    var al3 = a3 & 0x1fff;
	    var ah3 = a3 >>> 13;
	    var a4 = a[4] | 0;
	    var al4 = a4 & 0x1fff;
	    var ah4 = a4 >>> 13;
	    var a5 = a[5] | 0;
	    var al5 = a5 & 0x1fff;
	    var ah5 = a5 >>> 13;
	    var a6 = a[6] | 0;
	    var al6 = a6 & 0x1fff;
	    var ah6 = a6 >>> 13;
	    var a7 = a[7] | 0;
	    var al7 = a7 & 0x1fff;
	    var ah7 = a7 >>> 13;
	    var a8 = a[8] | 0;
	    var al8 = a8 & 0x1fff;
	    var ah8 = a8 >>> 13;
	    var a9 = a[9] | 0;
	    var al9 = a9 & 0x1fff;
	    var ah9 = a9 >>> 13;
	    var b0 = b[0] | 0;
	    var bl0 = b0 & 0x1fff;
	    var bh0 = b0 >>> 13;
	    var b1 = b[1] | 0;
	    var bl1 = b1 & 0x1fff;
	    var bh1 = b1 >>> 13;
	    var b2 = b[2] | 0;
	    var bl2 = b2 & 0x1fff;
	    var bh2 = b2 >>> 13;
	    var b3 = b[3] | 0;
	    var bl3 = b3 & 0x1fff;
	    var bh3 = b3 >>> 13;
	    var b4 = b[4] | 0;
	    var bl4 = b4 & 0x1fff;
	    var bh4 = b4 >>> 13;
	    var b5 = b[5] | 0;
	    var bl5 = b5 & 0x1fff;
	    var bh5 = b5 >>> 13;
	    var b6 = b[6] | 0;
	    var bl6 = b6 & 0x1fff;
	    var bh6 = b6 >>> 13;
	    var b7 = b[7] | 0;
	    var bl7 = b7 & 0x1fff;
	    var bh7 = b7 >>> 13;
	    var b8 = b[8] | 0;
	    var bl8 = b8 & 0x1fff;
	    var bh8 = b8 >>> 13;
	    var b9 = b[9] | 0;
	    var bl9 = b9 & 0x1fff;
	    var bh9 = b9 >>> 13;

	    out.negative = self.negative ^ num.negative;
	    out.length = 19;
	    /* k = 0 */
	    lo = Math.imul(al0, bl0);
	    mid = Math.imul(al0, bh0);
	    mid = (mid + Math.imul(ah0, bl0)) | 0;
	    hi = Math.imul(ah0, bh0);
	    var w0 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w0 >>> 26)) | 0;
	    w0 &= 0x3ffffff;
	    /* k = 1 */
	    lo = Math.imul(al1, bl0);
	    mid = Math.imul(al1, bh0);
	    mid = (mid + Math.imul(ah1, bl0)) | 0;
	    hi = Math.imul(ah1, bh0);
	    lo = (lo + Math.imul(al0, bl1)) | 0;
	    mid = (mid + Math.imul(al0, bh1)) | 0;
	    mid = (mid + Math.imul(ah0, bl1)) | 0;
	    hi = (hi + Math.imul(ah0, bh1)) | 0;
	    var w1 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w1 >>> 26)) | 0;
	    w1 &= 0x3ffffff;
	    /* k = 2 */
	    lo = Math.imul(al2, bl0);
	    mid = Math.imul(al2, bh0);
	    mid = (mid + Math.imul(ah2, bl0)) | 0;
	    hi = Math.imul(ah2, bh0);
	    lo = (lo + Math.imul(al1, bl1)) | 0;
	    mid = (mid + Math.imul(al1, bh1)) | 0;
	    mid = (mid + Math.imul(ah1, bl1)) | 0;
	    hi = (hi + Math.imul(ah1, bh1)) | 0;
	    lo = (lo + Math.imul(al0, bl2)) | 0;
	    mid = (mid + Math.imul(al0, bh2)) | 0;
	    mid = (mid + Math.imul(ah0, bl2)) | 0;
	    hi = (hi + Math.imul(ah0, bh2)) | 0;
	    var w2 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w2 >>> 26)) | 0;
	    w2 &= 0x3ffffff;
	    /* k = 3 */
	    lo = Math.imul(al3, bl0);
	    mid = Math.imul(al3, bh0);
	    mid = (mid + Math.imul(ah3, bl0)) | 0;
	    hi = Math.imul(ah3, bh0);
	    lo = (lo + Math.imul(al2, bl1)) | 0;
	    mid = (mid + Math.imul(al2, bh1)) | 0;
	    mid = (mid + Math.imul(ah2, bl1)) | 0;
	    hi = (hi + Math.imul(ah2, bh1)) | 0;
	    lo = (lo + Math.imul(al1, bl2)) | 0;
	    mid = (mid + Math.imul(al1, bh2)) | 0;
	    mid = (mid + Math.imul(ah1, bl2)) | 0;
	    hi = (hi + Math.imul(ah1, bh2)) | 0;
	    lo = (lo + Math.imul(al0, bl3)) | 0;
	    mid = (mid + Math.imul(al0, bh3)) | 0;
	    mid = (mid + Math.imul(ah0, bl3)) | 0;
	    hi = (hi + Math.imul(ah0, bh3)) | 0;
	    var w3 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w3 >>> 26)) | 0;
	    w3 &= 0x3ffffff;
	    /* k = 4 */
	    lo = Math.imul(al4, bl0);
	    mid = Math.imul(al4, bh0);
	    mid = (mid + Math.imul(ah4, bl0)) | 0;
	    hi = Math.imul(ah4, bh0);
	    lo = (lo + Math.imul(al3, bl1)) | 0;
	    mid = (mid + Math.imul(al3, bh1)) | 0;
	    mid = (mid + Math.imul(ah3, bl1)) | 0;
	    hi = (hi + Math.imul(ah3, bh1)) | 0;
	    lo = (lo + Math.imul(al2, bl2)) | 0;
	    mid = (mid + Math.imul(al2, bh2)) | 0;
	    mid = (mid + Math.imul(ah2, bl2)) | 0;
	    hi = (hi + Math.imul(ah2, bh2)) | 0;
	    lo = (lo + Math.imul(al1, bl3)) | 0;
	    mid = (mid + Math.imul(al1, bh3)) | 0;
	    mid = (mid + Math.imul(ah1, bl3)) | 0;
	    hi = (hi + Math.imul(ah1, bh3)) | 0;
	    lo = (lo + Math.imul(al0, bl4)) | 0;
	    mid = (mid + Math.imul(al0, bh4)) | 0;
	    mid = (mid + Math.imul(ah0, bl4)) | 0;
	    hi = (hi + Math.imul(ah0, bh4)) | 0;
	    var w4 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w4 >>> 26)) | 0;
	    w4 &= 0x3ffffff;
	    /* k = 5 */
	    lo = Math.imul(al5, bl0);
	    mid = Math.imul(al5, bh0);
	    mid = (mid + Math.imul(ah5, bl0)) | 0;
	    hi = Math.imul(ah5, bh0);
	    lo = (lo + Math.imul(al4, bl1)) | 0;
	    mid = (mid + Math.imul(al4, bh1)) | 0;
	    mid = (mid + Math.imul(ah4, bl1)) | 0;
	    hi = (hi + Math.imul(ah4, bh1)) | 0;
	    lo = (lo + Math.imul(al3, bl2)) | 0;
	    mid = (mid + Math.imul(al3, bh2)) | 0;
	    mid = (mid + Math.imul(ah3, bl2)) | 0;
	    hi = (hi + Math.imul(ah3, bh2)) | 0;
	    lo = (lo + Math.imul(al2, bl3)) | 0;
	    mid = (mid + Math.imul(al2, bh3)) | 0;
	    mid = (mid + Math.imul(ah2, bl3)) | 0;
	    hi = (hi + Math.imul(ah2, bh3)) | 0;
	    lo = (lo + Math.imul(al1, bl4)) | 0;
	    mid = (mid + Math.imul(al1, bh4)) | 0;
	    mid = (mid + Math.imul(ah1, bl4)) | 0;
	    hi = (hi + Math.imul(ah1, bh4)) | 0;
	    lo = (lo + Math.imul(al0, bl5)) | 0;
	    mid = (mid + Math.imul(al0, bh5)) | 0;
	    mid = (mid + Math.imul(ah0, bl5)) | 0;
	    hi = (hi + Math.imul(ah0, bh5)) | 0;
	    var w5 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w5 >>> 26)) | 0;
	    w5 &= 0x3ffffff;
	    /* k = 6 */
	    lo = Math.imul(al6, bl0);
	    mid = Math.imul(al6, bh0);
	    mid = (mid + Math.imul(ah6, bl0)) | 0;
	    hi = Math.imul(ah6, bh0);
	    lo = (lo + Math.imul(al5, bl1)) | 0;
	    mid = (mid + Math.imul(al5, bh1)) | 0;
	    mid = (mid + Math.imul(ah5, bl1)) | 0;
	    hi = (hi + Math.imul(ah5, bh1)) | 0;
	    lo = (lo + Math.imul(al4, bl2)) | 0;
	    mid = (mid + Math.imul(al4, bh2)) | 0;
	    mid = (mid + Math.imul(ah4, bl2)) | 0;
	    hi = (hi + Math.imul(ah4, bh2)) | 0;
	    lo = (lo + Math.imul(al3, bl3)) | 0;
	    mid = (mid + Math.imul(al3, bh3)) | 0;
	    mid = (mid + Math.imul(ah3, bl3)) | 0;
	    hi = (hi + Math.imul(ah3, bh3)) | 0;
	    lo = (lo + Math.imul(al2, bl4)) | 0;
	    mid = (mid + Math.imul(al2, bh4)) | 0;
	    mid = (mid + Math.imul(ah2, bl4)) | 0;
	    hi = (hi + Math.imul(ah2, bh4)) | 0;
	    lo = (lo + Math.imul(al1, bl5)) | 0;
	    mid = (mid + Math.imul(al1, bh5)) | 0;
	    mid = (mid + Math.imul(ah1, bl5)) | 0;
	    hi = (hi + Math.imul(ah1, bh5)) | 0;
	    lo = (lo + Math.imul(al0, bl6)) | 0;
	    mid = (mid + Math.imul(al0, bh6)) | 0;
	    mid = (mid + Math.imul(ah0, bl6)) | 0;
	    hi = (hi + Math.imul(ah0, bh6)) | 0;
	    var w6 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w6 >>> 26)) | 0;
	    w6 &= 0x3ffffff;
	    /* k = 7 */
	    lo = Math.imul(al7, bl0);
	    mid = Math.imul(al7, bh0);
	    mid = (mid + Math.imul(ah7, bl0)) | 0;
	    hi = Math.imul(ah7, bh0);
	    lo = (lo + Math.imul(al6, bl1)) | 0;
	    mid = (mid + Math.imul(al6, bh1)) | 0;
	    mid = (mid + Math.imul(ah6, bl1)) | 0;
	    hi = (hi + Math.imul(ah6, bh1)) | 0;
	    lo = (lo + Math.imul(al5, bl2)) | 0;
	    mid = (mid + Math.imul(al5, bh2)) | 0;
	    mid = (mid + Math.imul(ah5, bl2)) | 0;
	    hi = (hi + Math.imul(ah5, bh2)) | 0;
	    lo = (lo + Math.imul(al4, bl3)) | 0;
	    mid = (mid + Math.imul(al4, bh3)) | 0;
	    mid = (mid + Math.imul(ah4, bl3)) | 0;
	    hi = (hi + Math.imul(ah4, bh3)) | 0;
	    lo = (lo + Math.imul(al3, bl4)) | 0;
	    mid = (mid + Math.imul(al3, bh4)) | 0;
	    mid = (mid + Math.imul(ah3, bl4)) | 0;
	    hi = (hi + Math.imul(ah3, bh4)) | 0;
	    lo = (lo + Math.imul(al2, bl5)) | 0;
	    mid = (mid + Math.imul(al2, bh5)) | 0;
	    mid = (mid + Math.imul(ah2, bl5)) | 0;
	    hi = (hi + Math.imul(ah2, bh5)) | 0;
	    lo = (lo + Math.imul(al1, bl6)) | 0;
	    mid = (mid + Math.imul(al1, bh6)) | 0;
	    mid = (mid + Math.imul(ah1, bl6)) | 0;
	    hi = (hi + Math.imul(ah1, bh6)) | 0;
	    lo = (lo + Math.imul(al0, bl7)) | 0;
	    mid = (mid + Math.imul(al0, bh7)) | 0;
	    mid = (mid + Math.imul(ah0, bl7)) | 0;
	    hi = (hi + Math.imul(ah0, bh7)) | 0;
	    var w7 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w7 >>> 26)) | 0;
	    w7 &= 0x3ffffff;
	    /* k = 8 */
	    lo = Math.imul(al8, bl0);
	    mid = Math.imul(al8, bh0);
	    mid = (mid + Math.imul(ah8, bl0)) | 0;
	    hi = Math.imul(ah8, bh0);
	    lo = (lo + Math.imul(al7, bl1)) | 0;
	    mid = (mid + Math.imul(al7, bh1)) | 0;
	    mid = (mid + Math.imul(ah7, bl1)) | 0;
	    hi = (hi + Math.imul(ah7, bh1)) | 0;
	    lo = (lo + Math.imul(al6, bl2)) | 0;
	    mid = (mid + Math.imul(al6, bh2)) | 0;
	    mid = (mid + Math.imul(ah6, bl2)) | 0;
	    hi = (hi + Math.imul(ah6, bh2)) | 0;
	    lo = (lo + Math.imul(al5, bl3)) | 0;
	    mid = (mid + Math.imul(al5, bh3)) | 0;
	    mid = (mid + Math.imul(ah5, bl3)) | 0;
	    hi = (hi + Math.imul(ah5, bh3)) | 0;
	    lo = (lo + Math.imul(al4, bl4)) | 0;
	    mid = (mid + Math.imul(al4, bh4)) | 0;
	    mid = (mid + Math.imul(ah4, bl4)) | 0;
	    hi = (hi + Math.imul(ah4, bh4)) | 0;
	    lo = (lo + Math.imul(al3, bl5)) | 0;
	    mid = (mid + Math.imul(al3, bh5)) | 0;
	    mid = (mid + Math.imul(ah3, bl5)) | 0;
	    hi = (hi + Math.imul(ah3, bh5)) | 0;
	    lo = (lo + Math.imul(al2, bl6)) | 0;
	    mid = (mid + Math.imul(al2, bh6)) | 0;
	    mid = (mid + Math.imul(ah2, bl6)) | 0;
	    hi = (hi + Math.imul(ah2, bh6)) | 0;
	    lo = (lo + Math.imul(al1, bl7)) | 0;
	    mid = (mid + Math.imul(al1, bh7)) | 0;
	    mid = (mid + Math.imul(ah1, bl7)) | 0;
	    hi = (hi + Math.imul(ah1, bh7)) | 0;
	    lo = (lo + Math.imul(al0, bl8)) | 0;
	    mid = (mid + Math.imul(al0, bh8)) | 0;
	    mid = (mid + Math.imul(ah0, bl8)) | 0;
	    hi = (hi + Math.imul(ah0, bh8)) | 0;
	    var w8 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w8 >>> 26)) | 0;
	    w8 &= 0x3ffffff;
	    /* k = 9 */
	    lo = Math.imul(al9, bl0);
	    mid = Math.imul(al9, bh0);
	    mid = (mid + Math.imul(ah9, bl0)) | 0;
	    hi = Math.imul(ah9, bh0);
	    lo = (lo + Math.imul(al8, bl1)) | 0;
	    mid = (mid + Math.imul(al8, bh1)) | 0;
	    mid = (mid + Math.imul(ah8, bl1)) | 0;
	    hi = (hi + Math.imul(ah8, bh1)) | 0;
	    lo = (lo + Math.imul(al7, bl2)) | 0;
	    mid = (mid + Math.imul(al7, bh2)) | 0;
	    mid = (mid + Math.imul(ah7, bl2)) | 0;
	    hi = (hi + Math.imul(ah7, bh2)) | 0;
	    lo = (lo + Math.imul(al6, bl3)) | 0;
	    mid = (mid + Math.imul(al6, bh3)) | 0;
	    mid = (mid + Math.imul(ah6, bl3)) | 0;
	    hi = (hi + Math.imul(ah6, bh3)) | 0;
	    lo = (lo + Math.imul(al5, bl4)) | 0;
	    mid = (mid + Math.imul(al5, bh4)) | 0;
	    mid = (mid + Math.imul(ah5, bl4)) | 0;
	    hi = (hi + Math.imul(ah5, bh4)) | 0;
	    lo = (lo + Math.imul(al4, bl5)) | 0;
	    mid = (mid + Math.imul(al4, bh5)) | 0;
	    mid = (mid + Math.imul(ah4, bl5)) | 0;
	    hi = (hi + Math.imul(ah4, bh5)) | 0;
	    lo = (lo + Math.imul(al3, bl6)) | 0;
	    mid = (mid + Math.imul(al3, bh6)) | 0;
	    mid = (mid + Math.imul(ah3, bl6)) | 0;
	    hi = (hi + Math.imul(ah3, bh6)) | 0;
	    lo = (lo + Math.imul(al2, bl7)) | 0;
	    mid = (mid + Math.imul(al2, bh7)) | 0;
	    mid = (mid + Math.imul(ah2, bl7)) | 0;
	    hi = (hi + Math.imul(ah2, bh7)) | 0;
	    lo = (lo + Math.imul(al1, bl8)) | 0;
	    mid = (mid + Math.imul(al1, bh8)) | 0;
	    mid = (mid + Math.imul(ah1, bl8)) | 0;
	    hi = (hi + Math.imul(ah1, bh8)) | 0;
	    lo = (lo + Math.imul(al0, bl9)) | 0;
	    mid = (mid + Math.imul(al0, bh9)) | 0;
	    mid = (mid + Math.imul(ah0, bl9)) | 0;
	    hi = (hi + Math.imul(ah0, bh9)) | 0;
	    var w9 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w9 >>> 26)) | 0;
	    w9 &= 0x3ffffff;
	    /* k = 10 */
	    lo = Math.imul(al9, bl1);
	    mid = Math.imul(al9, bh1);
	    mid = (mid + Math.imul(ah9, bl1)) | 0;
	    hi = Math.imul(ah9, bh1);
	    lo = (lo + Math.imul(al8, bl2)) | 0;
	    mid = (mid + Math.imul(al8, bh2)) | 0;
	    mid = (mid + Math.imul(ah8, bl2)) | 0;
	    hi = (hi + Math.imul(ah8, bh2)) | 0;
	    lo = (lo + Math.imul(al7, bl3)) | 0;
	    mid = (mid + Math.imul(al7, bh3)) | 0;
	    mid = (mid + Math.imul(ah7, bl3)) | 0;
	    hi = (hi + Math.imul(ah7, bh3)) | 0;
	    lo = (lo + Math.imul(al6, bl4)) | 0;
	    mid = (mid + Math.imul(al6, bh4)) | 0;
	    mid = (mid + Math.imul(ah6, bl4)) | 0;
	    hi = (hi + Math.imul(ah6, bh4)) | 0;
	    lo = (lo + Math.imul(al5, bl5)) | 0;
	    mid = (mid + Math.imul(al5, bh5)) | 0;
	    mid = (mid + Math.imul(ah5, bl5)) | 0;
	    hi = (hi + Math.imul(ah5, bh5)) | 0;
	    lo = (lo + Math.imul(al4, bl6)) | 0;
	    mid = (mid + Math.imul(al4, bh6)) | 0;
	    mid = (mid + Math.imul(ah4, bl6)) | 0;
	    hi = (hi + Math.imul(ah4, bh6)) | 0;
	    lo = (lo + Math.imul(al3, bl7)) | 0;
	    mid = (mid + Math.imul(al3, bh7)) | 0;
	    mid = (mid + Math.imul(ah3, bl7)) | 0;
	    hi = (hi + Math.imul(ah3, bh7)) | 0;
	    lo = (lo + Math.imul(al2, bl8)) | 0;
	    mid = (mid + Math.imul(al2, bh8)) | 0;
	    mid = (mid + Math.imul(ah2, bl8)) | 0;
	    hi = (hi + Math.imul(ah2, bh8)) | 0;
	    lo = (lo + Math.imul(al1, bl9)) | 0;
	    mid = (mid + Math.imul(al1, bh9)) | 0;
	    mid = (mid + Math.imul(ah1, bl9)) | 0;
	    hi = (hi + Math.imul(ah1, bh9)) | 0;
	    var w10 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w10 >>> 26)) | 0;
	    w10 &= 0x3ffffff;
	    /* k = 11 */
	    lo = Math.imul(al9, bl2);
	    mid = Math.imul(al9, bh2);
	    mid = (mid + Math.imul(ah9, bl2)) | 0;
	    hi = Math.imul(ah9, bh2);
	    lo = (lo + Math.imul(al8, bl3)) | 0;
	    mid = (mid + Math.imul(al8, bh3)) | 0;
	    mid = (mid + Math.imul(ah8, bl3)) | 0;
	    hi = (hi + Math.imul(ah8, bh3)) | 0;
	    lo = (lo + Math.imul(al7, bl4)) | 0;
	    mid = (mid + Math.imul(al7, bh4)) | 0;
	    mid = (mid + Math.imul(ah7, bl4)) | 0;
	    hi = (hi + Math.imul(ah7, bh4)) | 0;
	    lo = (lo + Math.imul(al6, bl5)) | 0;
	    mid = (mid + Math.imul(al6, bh5)) | 0;
	    mid = (mid + Math.imul(ah6, bl5)) | 0;
	    hi = (hi + Math.imul(ah6, bh5)) | 0;
	    lo = (lo + Math.imul(al5, bl6)) | 0;
	    mid = (mid + Math.imul(al5, bh6)) | 0;
	    mid = (mid + Math.imul(ah5, bl6)) | 0;
	    hi = (hi + Math.imul(ah5, bh6)) | 0;
	    lo = (lo + Math.imul(al4, bl7)) | 0;
	    mid = (mid + Math.imul(al4, bh7)) | 0;
	    mid = (mid + Math.imul(ah4, bl7)) | 0;
	    hi = (hi + Math.imul(ah4, bh7)) | 0;
	    lo = (lo + Math.imul(al3, bl8)) | 0;
	    mid = (mid + Math.imul(al3, bh8)) | 0;
	    mid = (mid + Math.imul(ah3, bl8)) | 0;
	    hi = (hi + Math.imul(ah3, bh8)) | 0;
	    lo = (lo + Math.imul(al2, bl9)) | 0;
	    mid = (mid + Math.imul(al2, bh9)) | 0;
	    mid = (mid + Math.imul(ah2, bl9)) | 0;
	    hi = (hi + Math.imul(ah2, bh9)) | 0;
	    var w11 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w11 >>> 26)) | 0;
	    w11 &= 0x3ffffff;
	    /* k = 12 */
	    lo = Math.imul(al9, bl3);
	    mid = Math.imul(al9, bh3);
	    mid = (mid + Math.imul(ah9, bl3)) | 0;
	    hi = Math.imul(ah9, bh3);
	    lo = (lo + Math.imul(al8, bl4)) | 0;
	    mid = (mid + Math.imul(al8, bh4)) | 0;
	    mid = (mid + Math.imul(ah8, bl4)) | 0;
	    hi = (hi + Math.imul(ah8, bh4)) | 0;
	    lo = (lo + Math.imul(al7, bl5)) | 0;
	    mid = (mid + Math.imul(al7, bh5)) | 0;
	    mid = (mid + Math.imul(ah7, bl5)) | 0;
	    hi = (hi + Math.imul(ah7, bh5)) | 0;
	    lo = (lo + Math.imul(al6, bl6)) | 0;
	    mid = (mid + Math.imul(al6, bh6)) | 0;
	    mid = (mid + Math.imul(ah6, bl6)) | 0;
	    hi = (hi + Math.imul(ah6, bh6)) | 0;
	    lo = (lo + Math.imul(al5, bl7)) | 0;
	    mid = (mid + Math.imul(al5, bh7)) | 0;
	    mid = (mid + Math.imul(ah5, bl7)) | 0;
	    hi = (hi + Math.imul(ah5, bh7)) | 0;
	    lo = (lo + Math.imul(al4, bl8)) | 0;
	    mid = (mid + Math.imul(al4, bh8)) | 0;
	    mid = (mid + Math.imul(ah4, bl8)) | 0;
	    hi = (hi + Math.imul(ah4, bh8)) | 0;
	    lo = (lo + Math.imul(al3, bl9)) | 0;
	    mid = (mid + Math.imul(al3, bh9)) | 0;
	    mid = (mid + Math.imul(ah3, bl9)) | 0;
	    hi = (hi + Math.imul(ah3, bh9)) | 0;
	    var w12 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w12 >>> 26)) | 0;
	    w12 &= 0x3ffffff;
	    /* k = 13 */
	    lo = Math.imul(al9, bl4);
	    mid = Math.imul(al9, bh4);
	    mid = (mid + Math.imul(ah9, bl4)) | 0;
	    hi = Math.imul(ah9, bh4);
	    lo = (lo + Math.imul(al8, bl5)) | 0;
	    mid = (mid + Math.imul(al8, bh5)) | 0;
	    mid = (mid + Math.imul(ah8, bl5)) | 0;
	    hi = (hi + Math.imul(ah8, bh5)) | 0;
	    lo = (lo + Math.imul(al7, bl6)) | 0;
	    mid = (mid + Math.imul(al7, bh6)) | 0;
	    mid = (mid + Math.imul(ah7, bl6)) | 0;
	    hi = (hi + Math.imul(ah7, bh6)) | 0;
	    lo = (lo + Math.imul(al6, bl7)) | 0;
	    mid = (mid + Math.imul(al6, bh7)) | 0;
	    mid = (mid + Math.imul(ah6, bl7)) | 0;
	    hi = (hi + Math.imul(ah6, bh7)) | 0;
	    lo = (lo + Math.imul(al5, bl8)) | 0;
	    mid = (mid + Math.imul(al5, bh8)) | 0;
	    mid = (mid + Math.imul(ah5, bl8)) | 0;
	    hi = (hi + Math.imul(ah5, bh8)) | 0;
	    lo = (lo + Math.imul(al4, bl9)) | 0;
	    mid = (mid + Math.imul(al4, bh9)) | 0;
	    mid = (mid + Math.imul(ah4, bl9)) | 0;
	    hi = (hi + Math.imul(ah4, bh9)) | 0;
	    var w13 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w13 >>> 26)) | 0;
	    w13 &= 0x3ffffff;
	    /* k = 14 */
	    lo = Math.imul(al9, bl5);
	    mid = Math.imul(al9, bh5);
	    mid = (mid + Math.imul(ah9, bl5)) | 0;
	    hi = Math.imul(ah9, bh5);
	    lo = (lo + Math.imul(al8, bl6)) | 0;
	    mid = (mid + Math.imul(al8, bh6)) | 0;
	    mid = (mid + Math.imul(ah8, bl6)) | 0;
	    hi = (hi + Math.imul(ah8, bh6)) | 0;
	    lo = (lo + Math.imul(al7, bl7)) | 0;
	    mid = (mid + Math.imul(al7, bh7)) | 0;
	    mid = (mid + Math.imul(ah7, bl7)) | 0;
	    hi = (hi + Math.imul(ah7, bh7)) | 0;
	    lo = (lo + Math.imul(al6, bl8)) | 0;
	    mid = (mid + Math.imul(al6, bh8)) | 0;
	    mid = (mid + Math.imul(ah6, bl8)) | 0;
	    hi = (hi + Math.imul(ah6, bh8)) | 0;
	    lo = (lo + Math.imul(al5, bl9)) | 0;
	    mid = (mid + Math.imul(al5, bh9)) | 0;
	    mid = (mid + Math.imul(ah5, bl9)) | 0;
	    hi = (hi + Math.imul(ah5, bh9)) | 0;
	    var w14 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w14 >>> 26)) | 0;
	    w14 &= 0x3ffffff;
	    /* k = 15 */
	    lo = Math.imul(al9, bl6);
	    mid = Math.imul(al9, bh6);
	    mid = (mid + Math.imul(ah9, bl6)) | 0;
	    hi = Math.imul(ah9, bh6);
	    lo = (lo + Math.imul(al8, bl7)) | 0;
	    mid = (mid + Math.imul(al8, bh7)) | 0;
	    mid = (mid + Math.imul(ah8, bl7)) | 0;
	    hi = (hi + Math.imul(ah8, bh7)) | 0;
	    lo = (lo + Math.imul(al7, bl8)) | 0;
	    mid = (mid + Math.imul(al7, bh8)) | 0;
	    mid = (mid + Math.imul(ah7, bl8)) | 0;
	    hi = (hi + Math.imul(ah7, bh8)) | 0;
	    lo = (lo + Math.imul(al6, bl9)) | 0;
	    mid = (mid + Math.imul(al6, bh9)) | 0;
	    mid = (mid + Math.imul(ah6, bl9)) | 0;
	    hi = (hi + Math.imul(ah6, bh9)) | 0;
	    var w15 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w15 >>> 26)) | 0;
	    w15 &= 0x3ffffff;
	    /* k = 16 */
	    lo = Math.imul(al9, bl7);
	    mid = Math.imul(al9, bh7);
	    mid = (mid + Math.imul(ah9, bl7)) | 0;
	    hi = Math.imul(ah9, bh7);
	    lo = (lo + Math.imul(al8, bl8)) | 0;
	    mid = (mid + Math.imul(al8, bh8)) | 0;
	    mid = (mid + Math.imul(ah8, bl8)) | 0;
	    hi = (hi + Math.imul(ah8, bh8)) | 0;
	    lo = (lo + Math.imul(al7, bl9)) | 0;
	    mid = (mid + Math.imul(al7, bh9)) | 0;
	    mid = (mid + Math.imul(ah7, bl9)) | 0;
	    hi = (hi + Math.imul(ah7, bh9)) | 0;
	    var w16 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w16 >>> 26)) | 0;
	    w16 &= 0x3ffffff;
	    /* k = 17 */
	    lo = Math.imul(al9, bl8);
	    mid = Math.imul(al9, bh8);
	    mid = (mid + Math.imul(ah9, bl8)) | 0;
	    hi = Math.imul(ah9, bh8);
	    lo = (lo + Math.imul(al8, bl9)) | 0;
	    mid = (mid + Math.imul(al8, bh9)) | 0;
	    mid = (mid + Math.imul(ah8, bl9)) | 0;
	    hi = (hi + Math.imul(ah8, bh9)) | 0;
	    var w17 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w17 >>> 26)) | 0;
	    w17 &= 0x3ffffff;
	    /* k = 18 */
	    lo = Math.imul(al9, bl9);
	    mid = Math.imul(al9, bh9);
	    mid = (mid + Math.imul(ah9, bl9)) | 0;
	    hi = Math.imul(ah9, bh9);
	    var w18 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w18 >>> 26)) | 0;
	    w18 &= 0x3ffffff;
	    o[0] = w0;
	    o[1] = w1;
	    o[2] = w2;
	    o[3] = w3;
	    o[4] = w4;
	    o[5] = w5;
	    o[6] = w6;
	    o[7] = w7;
	    o[8] = w8;
	    o[9] = w9;
	    o[10] = w10;
	    o[11] = w11;
	    o[12] = w12;
	    o[13] = w13;
	    o[14] = w14;
	    o[15] = w15;
	    o[16] = w16;
	    o[17] = w17;
	    o[18] = w18;
	    if (c !== 0) {
	      o[19] = c;
	      out.length++;
	    }
	    return out;
	  };

	  // Polyfill comb
	  if (!Math.imul) {
	    comb10MulTo = smallMulTo;
	  }

	  function bigMulTo (self, num, out) {
	    out.negative = num.negative ^ self.negative;
	    out.length = self.length + num.length;

	    var carry = 0;
	    var hncarry = 0;
	    for (var k = 0; k < out.length - 1; k++) {
	      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
	      // note that ncarry could be >= 0x3ffffff
	      var ncarry = hncarry;
	      hncarry = 0;
	      var rword = carry & 0x3ffffff;
	      var maxJ = Math.min(k, num.length - 1);
	      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
	        var i = k - j;
	        var a = self.words[i] | 0;
	        var b = num.words[j] | 0;
	        var r = a * b;

	        var lo = r & 0x3ffffff;
	        ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
	        lo = (lo + rword) | 0;
	        rword = lo & 0x3ffffff;
	        ncarry = (ncarry + (lo >>> 26)) | 0;

	        hncarry += ncarry >>> 26;
	        ncarry &= 0x3ffffff;
	      }
	      out.words[k] = rword;
	      carry = ncarry;
	      ncarry = hncarry;
	    }
	    if (carry !== 0) {
	      out.words[k] = carry;
	    } else {
	      out.length--;
	    }

	    return out.strip();
	  }

	  function jumboMulTo (self, num, out) {
	    var fftm = new FFTM();
	    return fftm.mulp(self, num, out);
	  }

	  BN.prototype.mulTo = function mulTo (num, out) {
	    var res;
	    var len = this.length + num.length;
	    if (this.length === 10 && num.length === 10) {
	      res = comb10MulTo(this, num, out);
	    } else if (len < 63) {
	      res = smallMulTo(this, num, out);
	    } else if (len < 1024) {
	      res = bigMulTo(this, num, out);
	    } else {
	      res = jumboMulTo(this, num, out);
	    }

	    return res;
	  };

	  // Cooley-Tukey algorithm for FFT
	  // slightly revisited to rely on looping instead of recursion

	  function FFTM (x, y) {
	    this.x = x;
	    this.y = y;
	  }

	  FFTM.prototype.makeRBT = function makeRBT (N) {
	    var t = new Array(N);
	    var l = BN.prototype._countBits(N) - 1;
	    for (var i = 0; i < N; i++) {
	      t[i] = this.revBin(i, l, N);
	    }

	    return t;
	  };

	  // Returns binary-reversed representation of `x`
	  FFTM.prototype.revBin = function revBin (x, l, N) {
	    if (x === 0 || x === N - 1) return x;

	    var rb = 0;
	    for (var i = 0; i < l; i++) {
	      rb |= (x & 1) << (l - i - 1);
	      x >>= 1;
	    }

	    return rb;
	  };

	  // Performs "tweedling" phase, therefore 'emulating'
	  // behaviour of the recursive algorithm
	  FFTM.prototype.permute = function permute (rbt, rws, iws, rtws, itws, N) {
	    for (var i = 0; i < N; i++) {
	      rtws[i] = rws[rbt[i]];
	      itws[i] = iws[rbt[i]];
	    }
	  };

	  FFTM.prototype.transform = function transform (rws, iws, rtws, itws, N, rbt) {
	    this.permute(rbt, rws, iws, rtws, itws, N);

	    for (var s = 1; s < N; s <<= 1) {
	      var l = s << 1;

	      var rtwdf = Math.cos(2 * Math.PI / l);
	      var itwdf = Math.sin(2 * Math.PI / l);

	      for (var p = 0; p < N; p += l) {
	        var rtwdf_ = rtwdf;
	        var itwdf_ = itwdf;

	        for (var j = 0; j < s; j++) {
	          var re = rtws[p + j];
	          var ie = itws[p + j];

	          var ro = rtws[p + j + s];
	          var io = itws[p + j + s];

	          var rx = rtwdf_ * ro - itwdf_ * io;

	          io = rtwdf_ * io + itwdf_ * ro;
	          ro = rx;

	          rtws[p + j] = re + ro;
	          itws[p + j] = ie + io;

	          rtws[p + j + s] = re - ro;
	          itws[p + j + s] = ie - io;

	          /* jshint maxdepth : false */
	          if (j !== l) {
	            rx = rtwdf * rtwdf_ - itwdf * itwdf_;

	            itwdf_ = rtwdf * itwdf_ + itwdf * rtwdf_;
	            rtwdf_ = rx;
	          }
	        }
	      }
	    }
	  };

	  FFTM.prototype.guessLen13b = function guessLen13b (n, m) {
	    var N = Math.max(m, n) | 1;
	    var odd = N & 1;
	    var i = 0;
	    for (N = N / 2 | 0; N; N = N >>> 1) {
	      i++;
	    }

	    return 1 << i + 1 + odd;
	  };

	  FFTM.prototype.conjugate = function conjugate (rws, iws, N) {
	    if (N <= 1) return;

	    for (var i = 0; i < N / 2; i++) {
	      var t = rws[i];

	      rws[i] = rws[N - i - 1];
	      rws[N - i - 1] = t;

	      t = iws[i];

	      iws[i] = -iws[N - i - 1];
	      iws[N - i - 1] = -t;
	    }
	  };

	  FFTM.prototype.normalize13b = function normalize13b (ws, N) {
	    var carry = 0;
	    for (var i = 0; i < N / 2; i++) {
	      var w = Math.round(ws[2 * i + 1] / N) * 0x2000 +
	        Math.round(ws[2 * i] / N) +
	        carry;

	      ws[i] = w & 0x3ffffff;

	      if (w < 0x4000000) {
	        carry = 0;
	      } else {
	        carry = w / 0x4000000 | 0;
	      }
	    }

	    return ws;
	  };

	  FFTM.prototype.convert13b = function convert13b (ws, len, rws, N) {
	    var carry = 0;
	    for (var i = 0; i < len; i++) {
	      carry = carry + (ws[i] | 0);

	      rws[2 * i] = carry & 0x1fff; carry = carry >>> 13;
	      rws[2 * i + 1] = carry & 0x1fff; carry = carry >>> 13;
	    }

	    // Pad with zeroes
	    for (i = 2 * len; i < N; ++i) {
	      rws[i] = 0;
	    }

	    assert(carry === 0);
	    assert((carry & ~0x1fff) === 0);
	  };

	  FFTM.prototype.stub = function stub (N) {
	    var ph = new Array(N);
	    for (var i = 0; i < N; i++) {
	      ph[i] = 0;
	    }

	    return ph;
	  };

	  FFTM.prototype.mulp = function mulp (x, y, out) {
	    var N = 2 * this.guessLen13b(x.length, y.length);

	    var rbt = this.makeRBT(N);

	    var _ = this.stub(N);

	    var rws = new Array(N);
	    var rwst = new Array(N);
	    var iwst = new Array(N);

	    var nrws = new Array(N);
	    var nrwst = new Array(N);
	    var niwst = new Array(N);

	    var rmws = out.words;
	    rmws.length = N;

	    this.convert13b(x.words, x.length, rws, N);
	    this.convert13b(y.words, y.length, nrws, N);

	    this.transform(rws, _, rwst, iwst, N, rbt);
	    this.transform(nrws, _, nrwst, niwst, N, rbt);

	    for (var i = 0; i < N; i++) {
	      var rx = rwst[i] * nrwst[i] - iwst[i] * niwst[i];
	      iwst[i] = rwst[i] * niwst[i] + iwst[i] * nrwst[i];
	      rwst[i] = rx;
	    }

	    this.conjugate(rwst, iwst, N);
	    this.transform(rwst, iwst, rmws, _, N, rbt);
	    this.conjugate(rmws, _, N);
	    this.normalize13b(rmws, N);

	    out.negative = x.negative ^ y.negative;
	    out.length = x.length + y.length;
	    return out.strip();
	  };

	  // Multiply `this` by `num`
	  BN.prototype.mul = function mul (num) {
	    var out = new BN(null);
	    out.words = new Array(this.length + num.length);
	    return this.mulTo(num, out);
	  };

	  // Multiply employing FFT
	  BN.prototype.mulf = function mulf (num) {
	    var out = new BN(null);
	    out.words = new Array(this.length + num.length);
	    return jumboMulTo(this, num, out);
	  };

	  // In-place Multiplication
	  BN.prototype.imul = function imul (num) {
	    return this.clone().mulTo(num, this);
	  };

	  BN.prototype.imuln = function imuln (num) {
	    assert(typeof num === 'number');
	    assert(num < 0x4000000);

	    // Carry
	    var carry = 0;
	    for (var i = 0; i < this.length; i++) {
	      var w = (this.words[i] | 0) * num;
	      var lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
	      carry >>= 26;
	      carry += (w / 0x4000000) | 0;
	      // NOTE: lo is 27bit maximum
	      carry += lo >>> 26;
	      this.words[i] = lo & 0x3ffffff;
	    }

	    if (carry !== 0) {
	      this.words[i] = carry;
	      this.length++;
	    }

	    return this;
	  };

	  BN.prototype.muln = function muln (num) {
	    return this.clone().imuln(num);
	  };

	  // `this` * `this`
	  BN.prototype.sqr = function sqr () {
	    return this.mul(this);
	  };

	  // `this` * `this` in-place
	  BN.prototype.isqr = function isqr () {
	    return this.imul(this.clone());
	  };

	  // Math.pow(`this`, `num`)
	  BN.prototype.pow = function pow (num) {
	    var w = toBitArray(num);
	    if (w.length === 0) return new BN(1);

	    // Skip leading zeroes
	    var res = this;
	    for (var i = 0; i < w.length; i++, res = res.sqr()) {
	      if (w[i] !== 0) break;
	    }

	    if (++i < w.length) {
	      for (var q = res.sqr(); i < w.length; i++, q = q.sqr()) {
	        if (w[i] === 0) continue;

	        res = res.mul(q);
	      }
	    }

	    return res;
	  };

	  // Shift-left in-place
	  BN.prototype.iushln = function iushln (bits) {
	    assert(typeof bits === 'number' && bits >= 0);
	    var r = bits % 26;
	    var s = (bits - r) / 26;
	    var carryMask = (0x3ffffff >>> (26 - r)) << (26 - r);
	    var i;

	    if (r !== 0) {
	      var carry = 0;

	      for (i = 0; i < this.length; i++) {
	        var newCarry = this.words[i] & carryMask;
	        var c = ((this.words[i] | 0) - newCarry) << r;
	        this.words[i] = c | carry;
	        carry = newCarry >>> (26 - r);
	      }

	      if (carry) {
	        this.words[i] = carry;
	        this.length++;
	      }
	    }

	    if (s !== 0) {
	      for (i = this.length - 1; i >= 0; i--) {
	        this.words[i + s] = this.words[i];
	      }

	      for (i = 0; i < s; i++) {
	        this.words[i] = 0;
	      }

	      this.length += s;
	    }

	    return this.strip();
	  };

	  BN.prototype.ishln = function ishln (bits) {
	    // TODO(indutny): implement me
	    assert(this.negative === 0);
	    return this.iushln(bits);
	  };

	  // Shift-right in-place
	  // NOTE: `hint` is a lowest bit before trailing zeroes
	  // NOTE: if `extended` is present - it will be filled with destroyed bits
	  BN.prototype.iushrn = function iushrn (bits, hint, extended) {
	    assert(typeof bits === 'number' && bits >= 0);
	    var h;
	    if (hint) {
	      h = (hint - (hint % 26)) / 26;
	    } else {
	      h = 0;
	    }

	    var r = bits % 26;
	    var s = Math.min((bits - r) / 26, this.length);
	    var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
	    var maskedWords = extended;

	    h -= s;
	    h = Math.max(0, h);

	    // Extended mode, copy masked part
	    if (maskedWords) {
	      for (var i = 0; i < s; i++) {
	        maskedWords.words[i] = this.words[i];
	      }
	      maskedWords.length = s;
	    }

	    if (s === 0) ; else if (this.length > s) {
	      this.length -= s;
	      for (i = 0; i < this.length; i++) {
	        this.words[i] = this.words[i + s];
	      }
	    } else {
	      this.words[0] = 0;
	      this.length = 1;
	    }

	    var carry = 0;
	    for (i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
	      var word = this.words[i] | 0;
	      this.words[i] = (carry << (26 - r)) | (word >>> r);
	      carry = word & mask;
	    }

	    // Push carried bits as a mask
	    if (maskedWords && carry !== 0) {
	      maskedWords.words[maskedWords.length++] = carry;
	    }

	    if (this.length === 0) {
	      this.words[0] = 0;
	      this.length = 1;
	    }

	    return this.strip();
	  };

	  BN.prototype.ishrn = function ishrn (bits, hint, extended) {
	    // TODO(indutny): implement me
	    assert(this.negative === 0);
	    return this.iushrn(bits, hint, extended);
	  };

	  // Shift-left
	  BN.prototype.shln = function shln (bits) {
	    return this.clone().ishln(bits);
	  };

	  BN.prototype.ushln = function ushln (bits) {
	    return this.clone().iushln(bits);
	  };

	  // Shift-right
	  BN.prototype.shrn = function shrn (bits) {
	    return this.clone().ishrn(bits);
	  };

	  BN.prototype.ushrn = function ushrn (bits) {
	    return this.clone().iushrn(bits);
	  };

	  // Test if n bit is set
	  BN.prototype.testn = function testn (bit) {
	    assert(typeof bit === 'number' && bit >= 0);
	    var r = bit % 26;
	    var s = (bit - r) / 26;
	    var q = 1 << r;

	    // Fast case: bit is much higher than all existing words
	    if (this.length <= s) return false;

	    // Check bit and return
	    var w = this.words[s];

	    return !!(w & q);
	  };

	  // Return only lowers bits of number (in-place)
	  BN.prototype.imaskn = function imaskn (bits) {
	    assert(typeof bits === 'number' && bits >= 0);
	    var r = bits % 26;
	    var s = (bits - r) / 26;

	    assert(this.negative === 0, 'imaskn works only with positive numbers');

	    if (this.length <= s) {
	      return this;
	    }

	    if (r !== 0) {
	      s++;
	    }
	    this.length = Math.min(s, this.length);

	    if (r !== 0) {
	      var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
	      this.words[this.length - 1] &= mask;
	    }

	    return this.strip();
	  };

	  // Return only lowers bits of number
	  BN.prototype.maskn = function maskn (bits) {
	    return this.clone().imaskn(bits);
	  };

	  // Add plain number `num` to `this`
	  BN.prototype.iaddn = function iaddn (num) {
	    assert(typeof num === 'number');
	    assert(num < 0x4000000);
	    if (num < 0) return this.isubn(-num);

	    // Possible sign change
	    if (this.negative !== 0) {
	      if (this.length === 1 && (this.words[0] | 0) < num) {
	        this.words[0] = num - (this.words[0] | 0);
	        this.negative = 0;
	        return this;
	      }

	      this.negative = 0;
	      this.isubn(num);
	      this.negative = 1;
	      return this;
	    }

	    // Add without checks
	    return this._iaddn(num);
	  };

	  BN.prototype._iaddn = function _iaddn (num) {
	    this.words[0] += num;

	    // Carry
	    for (var i = 0; i < this.length && this.words[i] >= 0x4000000; i++) {
	      this.words[i] -= 0x4000000;
	      if (i === this.length - 1) {
	        this.words[i + 1] = 1;
	      } else {
	        this.words[i + 1]++;
	      }
	    }
	    this.length = Math.max(this.length, i + 1);

	    return this;
	  };

	  // Subtract plain number `num` from `this`
	  BN.prototype.isubn = function isubn (num) {
	    assert(typeof num === 'number');
	    assert(num < 0x4000000);
	    if (num < 0) return this.iaddn(-num);

	    if (this.negative !== 0) {
	      this.negative = 0;
	      this.iaddn(num);
	      this.negative = 1;
	      return this;
	    }

	    this.words[0] -= num;

	    if (this.length === 1 && this.words[0] < 0) {
	      this.words[0] = -this.words[0];
	      this.negative = 1;
	    } else {
	      // Carry
	      for (var i = 0; i < this.length && this.words[i] < 0; i++) {
	        this.words[i] += 0x4000000;
	        this.words[i + 1] -= 1;
	      }
	    }

	    return this.strip();
	  };

	  BN.prototype.addn = function addn (num) {
	    return this.clone().iaddn(num);
	  };

	  BN.prototype.subn = function subn (num) {
	    return this.clone().isubn(num);
	  };

	  BN.prototype.iabs = function iabs () {
	    this.negative = 0;

	    return this;
	  };

	  BN.prototype.abs = function abs () {
	    return this.clone().iabs();
	  };

	  BN.prototype._ishlnsubmul = function _ishlnsubmul (num, mul, shift) {
	    var len = num.length + shift;
	    var i;

	    this._expand(len);

	    var w;
	    var carry = 0;
	    for (i = 0; i < num.length; i++) {
	      w = (this.words[i + shift] | 0) + carry;
	      var right = (num.words[i] | 0) * mul;
	      w -= right & 0x3ffffff;
	      carry = (w >> 26) - ((right / 0x4000000) | 0);
	      this.words[i + shift] = w & 0x3ffffff;
	    }
	    for (; i < this.length - shift; i++) {
	      w = (this.words[i + shift] | 0) + carry;
	      carry = w >> 26;
	      this.words[i + shift] = w & 0x3ffffff;
	    }

	    if (carry === 0) return this.strip();

	    // Subtraction overflow
	    assert(carry === -1);
	    carry = 0;
	    for (i = 0; i < this.length; i++) {
	      w = -(this.words[i] | 0) + carry;
	      carry = w >> 26;
	      this.words[i] = w & 0x3ffffff;
	    }
	    this.negative = 1;

	    return this.strip();
	  };

	  BN.prototype._wordDiv = function _wordDiv (num, mode) {
	    var shift = this.length - num.length;

	    var a = this.clone();
	    var b = num;

	    // Normalize
	    var bhi = b.words[b.length - 1] | 0;
	    var bhiBits = this._countBits(bhi);
	    shift = 26 - bhiBits;
	    if (shift !== 0) {
	      b = b.ushln(shift);
	      a.iushln(shift);
	      bhi = b.words[b.length - 1] | 0;
	    }

	    // Initialize quotient
	    var m = a.length - b.length;
	    var q;

	    if (mode !== 'mod') {
	      q = new BN(null);
	      q.length = m + 1;
	      q.words = new Array(q.length);
	      for (var i = 0; i < q.length; i++) {
	        q.words[i] = 0;
	      }
	    }

	    var diff = a.clone()._ishlnsubmul(b, 1, m);
	    if (diff.negative === 0) {
	      a = diff;
	      if (q) {
	        q.words[m] = 1;
	      }
	    }

	    for (var j = m - 1; j >= 0; j--) {
	      var qj = (a.words[b.length + j] | 0) * 0x4000000 +
	        (a.words[b.length + j - 1] | 0);

	      // NOTE: (qj / bhi) is (0x3ffffff * 0x4000000 + 0x3ffffff) / 0x2000000 max
	      // (0x7ffffff)
	      qj = Math.min((qj / bhi) | 0, 0x3ffffff);

	      a._ishlnsubmul(b, qj, j);
	      while (a.negative !== 0) {
	        qj--;
	        a.negative = 0;
	        a._ishlnsubmul(b, 1, j);
	        if (!a.isZero()) {
	          a.negative ^= 1;
	        }
	      }
	      if (q) {
	        q.words[j] = qj;
	      }
	    }
	    if (q) {
	      q.strip();
	    }
	    a.strip();

	    // Denormalize
	    if (mode !== 'div' && shift !== 0) {
	      a.iushrn(shift);
	    }

	    return {
	      div: q || null,
	      mod: a
	    };
	  };

	  // NOTE: 1) `mode` can be set to `mod` to request mod only,
	  //       to `div` to request div only, or be absent to
	  //       request both div & mod
	  //       2) `positive` is true if unsigned mod is requested
	  BN.prototype.divmod = function divmod (num, mode, positive) {
	    assert(!num.isZero());

	    if (this.isZero()) {
	      return {
	        div: new BN(0),
	        mod: new BN(0)
	      };
	    }

	    var div, mod, res;
	    if (this.negative !== 0 && num.negative === 0) {
	      res = this.neg().divmod(num, mode);

	      if (mode !== 'mod') {
	        div = res.div.neg();
	      }

	      if (mode !== 'div') {
	        mod = res.mod.neg();
	        if (positive && mod.negative !== 0) {
	          mod.iadd(num);
	        }
	      }

	      return {
	        div: div,
	        mod: mod
	      };
	    }

	    if (this.negative === 0 && num.negative !== 0) {
	      res = this.divmod(num.neg(), mode);

	      if (mode !== 'mod') {
	        div = res.div.neg();
	      }

	      return {
	        div: div,
	        mod: res.mod
	      };
	    }

	    if ((this.negative & num.negative) !== 0) {
	      res = this.neg().divmod(num.neg(), mode);

	      if (mode !== 'div') {
	        mod = res.mod.neg();
	        if (positive && mod.negative !== 0) {
	          mod.isub(num);
	        }
	      }

	      return {
	        div: res.div,
	        mod: mod
	      };
	    }

	    // Both numbers are positive at this point

	    // Strip both numbers to approximate shift value
	    if (num.length > this.length || this.cmp(num) < 0) {
	      return {
	        div: new BN(0),
	        mod: this
	      };
	    }

	    // Very short reduction
	    if (num.length === 1) {
	      if (mode === 'div') {
	        return {
	          div: this.divn(num.words[0]),
	          mod: null
	        };
	      }

	      if (mode === 'mod') {
	        return {
	          div: null,
	          mod: new BN(this.modn(num.words[0]))
	        };
	      }

	      return {
	        div: this.divn(num.words[0]),
	        mod: new BN(this.modn(num.words[0]))
	      };
	    }

	    return this._wordDiv(num, mode);
	  };

	  // Find `this` / `num`
	  BN.prototype.div = function div (num) {
	    return this.divmod(num, 'div', false).div;
	  };

	  // Find `this` % `num`
	  BN.prototype.mod = function mod (num) {
	    return this.divmod(num, 'mod', false).mod;
	  };

	  BN.prototype.umod = function umod (num) {
	    return this.divmod(num, 'mod', true).mod;
	  };

	  // Find Round(`this` / `num`)
	  BN.prototype.divRound = function divRound (num) {
	    var dm = this.divmod(num);

	    // Fast case - exact division
	    if (dm.mod.isZero()) return dm.div;

	    var mod = dm.div.negative !== 0 ? dm.mod.isub(num) : dm.mod;

	    var half = num.ushrn(1);
	    var r2 = num.andln(1);
	    var cmp = mod.cmp(half);

	    // Round down
	    if (cmp < 0 || r2 === 1 && cmp === 0) return dm.div;

	    // Round up
	    return dm.div.negative !== 0 ? dm.div.isubn(1) : dm.div.iaddn(1);
	  };

	  BN.prototype.modn = function modn (num) {
	    assert(num <= 0x3ffffff);
	    var p = (1 << 26) % num;

	    var acc = 0;
	    for (var i = this.length - 1; i >= 0; i--) {
	      acc = (p * acc + (this.words[i] | 0)) % num;
	    }

	    return acc;
	  };

	  // In-place division by number
	  BN.prototype.idivn = function idivn (num) {
	    assert(num <= 0x3ffffff);

	    var carry = 0;
	    for (var i = this.length - 1; i >= 0; i--) {
	      var w = (this.words[i] | 0) + carry * 0x4000000;
	      this.words[i] = (w / num) | 0;
	      carry = w % num;
	    }

	    return this.strip();
	  };

	  BN.prototype.divn = function divn (num) {
	    return this.clone().idivn(num);
	  };

	  BN.prototype.egcd = function egcd (p) {
	    assert(p.negative === 0);
	    assert(!p.isZero());

	    var x = this;
	    var y = p.clone();

	    if (x.negative !== 0) {
	      x = x.umod(p);
	    } else {
	      x = x.clone();
	    }

	    // A * x + B * y = x
	    var A = new BN(1);
	    var B = new BN(0);

	    // C * x + D * y = y
	    var C = new BN(0);
	    var D = new BN(1);

	    var g = 0;

	    while (x.isEven() && y.isEven()) {
	      x.iushrn(1);
	      y.iushrn(1);
	      ++g;
	    }

	    var yp = y.clone();
	    var xp = x.clone();

	    while (!x.isZero()) {
	      for (var i = 0, im = 1; (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
	      if (i > 0) {
	        x.iushrn(i);
	        while (i-- > 0) {
	          if (A.isOdd() || B.isOdd()) {
	            A.iadd(yp);
	            B.isub(xp);
	          }

	          A.iushrn(1);
	          B.iushrn(1);
	        }
	      }

	      for (var j = 0, jm = 1; (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
	      if (j > 0) {
	        y.iushrn(j);
	        while (j-- > 0) {
	          if (C.isOdd() || D.isOdd()) {
	            C.iadd(yp);
	            D.isub(xp);
	          }

	          C.iushrn(1);
	          D.iushrn(1);
	        }
	      }

	      if (x.cmp(y) >= 0) {
	        x.isub(y);
	        A.isub(C);
	        B.isub(D);
	      } else {
	        y.isub(x);
	        C.isub(A);
	        D.isub(B);
	      }
	    }

	    return {
	      a: C,
	      b: D,
	      gcd: y.iushln(g)
	    };
	  };

	  // This is reduced incarnation of the binary EEA
	  // above, designated to invert members of the
	  // _prime_ fields F(p) at a maximal speed
	  BN.prototype._invmp = function _invmp (p) {
	    assert(p.negative === 0);
	    assert(!p.isZero());

	    var a = this;
	    var b = p.clone();

	    if (a.negative !== 0) {
	      a = a.umod(p);
	    } else {
	      a = a.clone();
	    }

	    var x1 = new BN(1);
	    var x2 = new BN(0);

	    var delta = b.clone();

	    while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
	      for (var i = 0, im = 1; (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
	      if (i > 0) {
	        a.iushrn(i);
	        while (i-- > 0) {
	          if (x1.isOdd()) {
	            x1.iadd(delta);
	          }

	          x1.iushrn(1);
	        }
	      }

	      for (var j = 0, jm = 1; (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
	      if (j > 0) {
	        b.iushrn(j);
	        while (j-- > 0) {
	          if (x2.isOdd()) {
	            x2.iadd(delta);
	          }

	          x2.iushrn(1);
	        }
	      }

	      if (a.cmp(b) >= 0) {
	        a.isub(b);
	        x1.isub(x2);
	      } else {
	        b.isub(a);
	        x2.isub(x1);
	      }
	    }

	    var res;
	    if (a.cmpn(1) === 0) {
	      res = x1;
	    } else {
	      res = x2;
	    }

	    if (res.cmpn(0) < 0) {
	      res.iadd(p);
	    }

	    return res;
	  };

	  BN.prototype.gcd = function gcd (num) {
	    if (this.isZero()) return num.abs();
	    if (num.isZero()) return this.abs();

	    var a = this.clone();
	    var b = num.clone();
	    a.negative = 0;
	    b.negative = 0;

	    // Remove common factor of two
	    for (var shift = 0; a.isEven() && b.isEven(); shift++) {
	      a.iushrn(1);
	      b.iushrn(1);
	    }

	    do {
	      while (a.isEven()) {
	        a.iushrn(1);
	      }
	      while (b.isEven()) {
	        b.iushrn(1);
	      }

	      var r = a.cmp(b);
	      if (r < 0) {
	        // Swap `a` and `b` to make `a` always bigger than `b`
	        var t = a;
	        a = b;
	        b = t;
	      } else if (r === 0 || b.cmpn(1) === 0) {
	        break;
	      }

	      a.isub(b);
	    } while (true);

	    return b.iushln(shift);
	  };

	  // Invert number in the field F(num)
	  BN.prototype.invm = function invm (num) {
	    return this.egcd(num).a.umod(num);
	  };

	  BN.prototype.isEven = function isEven () {
	    return (this.words[0] & 1) === 0;
	  };

	  BN.prototype.isOdd = function isOdd () {
	    return (this.words[0] & 1) === 1;
	  };

	  // And first word and num
	  BN.prototype.andln = function andln (num) {
	    return this.words[0] & num;
	  };

	  // Increment at the bit position in-line
	  BN.prototype.bincn = function bincn (bit) {
	    assert(typeof bit === 'number');
	    var r = bit % 26;
	    var s = (bit - r) / 26;
	    var q = 1 << r;

	    // Fast case: bit is much higher than all existing words
	    if (this.length <= s) {
	      this._expand(s + 1);
	      this.words[s] |= q;
	      return this;
	    }

	    // Add bit and propagate, if needed
	    var carry = q;
	    for (var i = s; carry !== 0 && i < this.length; i++) {
	      var w = this.words[i] | 0;
	      w += carry;
	      carry = w >>> 26;
	      w &= 0x3ffffff;
	      this.words[i] = w;
	    }
	    if (carry !== 0) {
	      this.words[i] = carry;
	      this.length++;
	    }
	    return this;
	  };

	  BN.prototype.isZero = function isZero () {
	    return this.length === 1 && this.words[0] === 0;
	  };

	  BN.prototype.cmpn = function cmpn (num) {
	    var negative = num < 0;

	    if (this.negative !== 0 && !negative) return -1;
	    if (this.negative === 0 && negative) return 1;

	    this.strip();

	    var res;
	    if (this.length > 1) {
	      res = 1;
	    } else {
	      if (negative) {
	        num = -num;
	      }

	      assert(num <= 0x3ffffff, 'Number is too big');

	      var w = this.words[0] | 0;
	      res = w === num ? 0 : w < num ? -1 : 1;
	    }
	    if (this.negative !== 0) return -res | 0;
	    return res;
	  };

	  // Compare two numbers and return:
	  // 1 - if `this` > `num`
	  // 0 - if `this` == `num`
	  // -1 - if `this` < `num`
	  BN.prototype.cmp = function cmp (num) {
	    if (this.negative !== 0 && num.negative === 0) return -1;
	    if (this.negative === 0 && num.negative !== 0) return 1;

	    var res = this.ucmp(num);
	    if (this.negative !== 0) return -res | 0;
	    return res;
	  };

	  // Unsigned comparison
	  BN.prototype.ucmp = function ucmp (num) {
	    // At this point both numbers have the same sign
	    if (this.length > num.length) return 1;
	    if (this.length < num.length) return -1;

	    var res = 0;
	    for (var i = this.length - 1; i >= 0; i--) {
	      var a = this.words[i] | 0;
	      var b = num.words[i] | 0;

	      if (a === b) continue;
	      if (a < b) {
	        res = -1;
	      } else if (a > b) {
	        res = 1;
	      }
	      break;
	    }
	    return res;
	  };

	  BN.prototype.gtn = function gtn (num) {
	    return this.cmpn(num) === 1;
	  };

	  BN.prototype.gt = function gt (num) {
	    return this.cmp(num) === 1;
	  };

	  BN.prototype.gten = function gten (num) {
	    return this.cmpn(num) >= 0;
	  };

	  BN.prototype.gte = function gte (num) {
	    return this.cmp(num) >= 0;
	  };

	  BN.prototype.ltn = function ltn (num) {
	    return this.cmpn(num) === -1;
	  };

	  BN.prototype.lt = function lt (num) {
	    return this.cmp(num) === -1;
	  };

	  BN.prototype.lten = function lten (num) {
	    return this.cmpn(num) <= 0;
	  };

	  BN.prototype.lte = function lte (num) {
	    return this.cmp(num) <= 0;
	  };

	  BN.prototype.eqn = function eqn (num) {
	    return this.cmpn(num) === 0;
	  };

	  BN.prototype.eq = function eq (num) {
	    return this.cmp(num) === 0;
	  };

	  //
	  // A reduce context, could be using montgomery or something better, depending
	  // on the `m` itself.
	  //
	  BN.red = function red (num) {
	    return new Red(num);
	  };

	  BN.prototype.toRed = function toRed (ctx) {
	    assert(!this.red, 'Already a number in reduction context');
	    assert(this.negative === 0, 'red works only with positives');
	    return ctx.convertTo(this)._forceRed(ctx);
	  };

	  BN.prototype.fromRed = function fromRed () {
	    assert(this.red, 'fromRed works only with numbers in reduction context');
	    return this.red.convertFrom(this);
	  };

	  BN.prototype._forceRed = function _forceRed (ctx) {
	    this.red = ctx;
	    return this;
	  };

	  BN.prototype.forceRed = function forceRed (ctx) {
	    assert(!this.red, 'Already a number in reduction context');
	    return this._forceRed(ctx);
	  };

	  BN.prototype.redAdd = function redAdd (num) {
	    assert(this.red, 'redAdd works only with red numbers');
	    return this.red.add(this, num);
	  };

	  BN.prototype.redIAdd = function redIAdd (num) {
	    assert(this.red, 'redIAdd works only with red numbers');
	    return this.red.iadd(this, num);
	  };

	  BN.prototype.redSub = function redSub (num) {
	    assert(this.red, 'redSub works only with red numbers');
	    return this.red.sub(this, num);
	  };

	  BN.prototype.redISub = function redISub (num) {
	    assert(this.red, 'redISub works only with red numbers');
	    return this.red.isub(this, num);
	  };

	  BN.prototype.redShl = function redShl (num) {
	    assert(this.red, 'redShl works only with red numbers');
	    return this.red.shl(this, num);
	  };

	  BN.prototype.redMul = function redMul (num) {
	    assert(this.red, 'redMul works only with red numbers');
	    this.red._verify2(this, num);
	    return this.red.mul(this, num);
	  };

	  BN.prototype.redIMul = function redIMul (num) {
	    assert(this.red, 'redMul works only with red numbers');
	    this.red._verify2(this, num);
	    return this.red.imul(this, num);
	  };

	  BN.prototype.redSqr = function redSqr () {
	    assert(this.red, 'redSqr works only with red numbers');
	    this.red._verify1(this);
	    return this.red.sqr(this);
	  };

	  BN.prototype.redISqr = function redISqr () {
	    assert(this.red, 'redISqr works only with red numbers');
	    this.red._verify1(this);
	    return this.red.isqr(this);
	  };

	  // Square root over p
	  BN.prototype.redSqrt = function redSqrt () {
	    assert(this.red, 'redSqrt works only with red numbers');
	    this.red._verify1(this);
	    return this.red.sqrt(this);
	  };

	  BN.prototype.redInvm = function redInvm () {
	    assert(this.red, 'redInvm works only with red numbers');
	    this.red._verify1(this);
	    return this.red.invm(this);
	  };

	  // Return negative clone of `this` % `red modulo`
	  BN.prototype.redNeg = function redNeg () {
	    assert(this.red, 'redNeg works only with red numbers');
	    this.red._verify1(this);
	    return this.red.neg(this);
	  };

	  BN.prototype.redPow = function redPow (num) {
	    assert(this.red && !num.red, 'redPow(normalNum)');
	    this.red._verify1(this);
	    return this.red.pow(this, num);
	  };

	  // Prime numbers with efficient reduction
	  var primes = {
	    k256: null,
	    p224: null,
	    p192: null,
	    p25519: null
	  };

	  // Pseudo-Mersenne prime
	  function MPrime (name, p) {
	    // P = 2 ^ N - K
	    this.name = name;
	    this.p = new BN(p, 16);
	    this.n = this.p.bitLength();
	    this.k = new BN(1).iushln(this.n).isub(this.p);

	    this.tmp = this._tmp();
	  }

	  MPrime.prototype._tmp = function _tmp () {
	    var tmp = new BN(null);
	    tmp.words = new Array(Math.ceil(this.n / 13));
	    return tmp;
	  };

	  MPrime.prototype.ireduce = function ireduce (num) {
	    // Assumes that `num` is less than `P^2`
	    // num = HI * (2 ^ N - K) + HI * K + LO = HI * K + LO (mod P)
	    var r = num;
	    var rlen;

	    do {
	      this.split(r, this.tmp);
	      r = this.imulK(r);
	      r = r.iadd(this.tmp);
	      rlen = r.bitLength();
	    } while (rlen > this.n);

	    var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
	    if (cmp === 0) {
	      r.words[0] = 0;
	      r.length = 1;
	    } else if (cmp > 0) {
	      r.isub(this.p);
	    } else {
	      r.strip();
	    }

	    return r;
	  };

	  MPrime.prototype.split = function split (input, out) {
	    input.iushrn(this.n, 0, out);
	  };

	  MPrime.prototype.imulK = function imulK (num) {
	    return num.imul(this.k);
	  };

	  function K256 () {
	    MPrime.call(
	      this,
	      'k256',
	      'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f');
	  }
	  inherits(K256, MPrime);

	  K256.prototype.split = function split (input, output) {
	    // 256 = 9 * 26 + 22
	    var mask = 0x3fffff;

	    var outLen = Math.min(input.length, 9);
	    for (var i = 0; i < outLen; i++) {
	      output.words[i] = input.words[i];
	    }
	    output.length = outLen;

	    if (input.length <= 9) {
	      input.words[0] = 0;
	      input.length = 1;
	      return;
	    }

	    // Shift by 9 limbs
	    var prev = input.words[9];
	    output.words[output.length++] = prev & mask;

	    for (i = 10; i < input.length; i++) {
	      var next = input.words[i] | 0;
	      input.words[i - 10] = ((next & mask) << 4) | (prev >>> 22);
	      prev = next;
	    }
	    prev >>>= 22;
	    input.words[i - 10] = prev;
	    if (prev === 0 && input.length > 10) {
	      input.length -= 10;
	    } else {
	      input.length -= 9;
	    }
	  };

	  K256.prototype.imulK = function imulK (num) {
	    // K = 0x1000003d1 = [ 0x40, 0x3d1 ]
	    num.words[num.length] = 0;
	    num.words[num.length + 1] = 0;
	    num.length += 2;

	    // bounded at: 0x40 * 0x3ffffff + 0x3d0 = 0x100000390
	    var lo = 0;
	    for (var i = 0; i < num.length; i++) {
	      var w = num.words[i] | 0;
	      lo += w * 0x3d1;
	      num.words[i] = lo & 0x3ffffff;
	      lo = w * 0x40 + ((lo / 0x4000000) | 0);
	    }

	    // Fast length reduction
	    if (num.words[num.length - 1] === 0) {
	      num.length--;
	      if (num.words[num.length - 1] === 0) {
	        num.length--;
	      }
	    }
	    return num;
	  };

	  function P224 () {
	    MPrime.call(
	      this,
	      'p224',
	      'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001');
	  }
	  inherits(P224, MPrime);

	  function P192 () {
	    MPrime.call(
	      this,
	      'p192',
	      'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff');
	  }
	  inherits(P192, MPrime);

	  function P25519 () {
	    // 2 ^ 255 - 19
	    MPrime.call(
	      this,
	      '25519',
	      '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed');
	  }
	  inherits(P25519, MPrime);

	  P25519.prototype.imulK = function imulK (num) {
	    // K = 0x13
	    var carry = 0;
	    for (var i = 0; i < num.length; i++) {
	      var hi = (num.words[i] | 0) * 0x13 + carry;
	      var lo = hi & 0x3ffffff;
	      hi >>>= 26;

	      num.words[i] = lo;
	      carry = hi;
	    }
	    if (carry !== 0) {
	      num.words[num.length++] = carry;
	    }
	    return num;
	  };

	  // Exported mostly for testing purposes, use plain name instead
	  BN._prime = function prime (name) {
	    // Cached version of prime
	    if (primes[name]) return primes[name];

	    var prime;
	    if (name === 'k256') {
	      prime = new K256();
	    } else if (name === 'p224') {
	      prime = new P224();
	    } else if (name === 'p192') {
	      prime = new P192();
	    } else if (name === 'p25519') {
	      prime = new P25519();
	    } else {
	      throw new Error('Unknown prime ' + name);
	    }
	    primes[name] = prime;

	    return prime;
	  };

	  //
	  // Base reduction engine
	  //
	  function Red (m) {
	    if (typeof m === 'string') {
	      var prime = BN._prime(m);
	      this.m = prime.p;
	      this.prime = prime;
	    } else {
	      assert(m.gtn(1), 'modulus must be greater than 1');
	      this.m = m;
	      this.prime = null;
	    }
	  }

	  Red.prototype._verify1 = function _verify1 (a) {
	    assert(a.negative === 0, 'red works only with positives');
	    assert(a.red, 'red works only with red numbers');
	  };

	  Red.prototype._verify2 = function _verify2 (a, b) {
	    assert((a.negative | b.negative) === 0, 'red works only with positives');
	    assert(a.red && a.red === b.red,
	      'red works only with red numbers');
	  };

	  Red.prototype.imod = function imod (a) {
	    if (this.prime) return this.prime.ireduce(a)._forceRed(this);
	    return a.umod(this.m)._forceRed(this);
	  };

	  Red.prototype.neg = function neg (a) {
	    if (a.isZero()) {
	      return a.clone();
	    }

	    return this.m.sub(a)._forceRed(this);
	  };

	  Red.prototype.add = function add (a, b) {
	    this._verify2(a, b);

	    var res = a.add(b);
	    if (res.cmp(this.m) >= 0) {
	      res.isub(this.m);
	    }
	    return res._forceRed(this);
	  };

	  Red.prototype.iadd = function iadd (a, b) {
	    this._verify2(a, b);

	    var res = a.iadd(b);
	    if (res.cmp(this.m) >= 0) {
	      res.isub(this.m);
	    }
	    return res;
	  };

	  Red.prototype.sub = function sub (a, b) {
	    this._verify2(a, b);

	    var res = a.sub(b);
	    if (res.cmpn(0) < 0) {
	      res.iadd(this.m);
	    }
	    return res._forceRed(this);
	  };

	  Red.prototype.isub = function isub (a, b) {
	    this._verify2(a, b);

	    var res = a.isub(b);
	    if (res.cmpn(0) < 0) {
	      res.iadd(this.m);
	    }
	    return res;
	  };

	  Red.prototype.shl = function shl (a, num) {
	    this._verify1(a);
	    return this.imod(a.ushln(num));
	  };

	  Red.prototype.imul = function imul (a, b) {
	    this._verify2(a, b);
	    return this.imod(a.imul(b));
	  };

	  Red.prototype.mul = function mul (a, b) {
	    this._verify2(a, b);
	    return this.imod(a.mul(b));
	  };

	  Red.prototype.isqr = function isqr (a) {
	    return this.imul(a, a.clone());
	  };

	  Red.prototype.sqr = function sqr (a) {
	    return this.mul(a, a);
	  };

	  Red.prototype.sqrt = function sqrt (a) {
	    if (a.isZero()) return a.clone();

	    var mod3 = this.m.andln(3);
	    assert(mod3 % 2 === 1);

	    // Fast case
	    if (mod3 === 3) {
	      var pow = this.m.add(new BN(1)).iushrn(2);
	      return this.pow(a, pow);
	    }

	    // Tonelli-Shanks algorithm (Totally unoptimized and slow)
	    //
	    // Find Q and S, that Q * 2 ^ S = (P - 1)
	    var q = this.m.subn(1);
	    var s = 0;
	    while (!q.isZero() && q.andln(1) === 0) {
	      s++;
	      q.iushrn(1);
	    }
	    assert(!q.isZero());

	    var one = new BN(1).toRed(this);
	    var nOne = one.redNeg();

	    // Find quadratic non-residue
	    // NOTE: Max is such because of generalized Riemann hypothesis.
	    var lpow = this.m.subn(1).iushrn(1);
	    var z = this.m.bitLength();
	    z = new BN(2 * z * z).toRed(this);

	    while (this.pow(z, lpow).cmp(nOne) !== 0) {
	      z.redIAdd(nOne);
	    }

	    var c = this.pow(z, q);
	    var r = this.pow(a, q.addn(1).iushrn(1));
	    var t = this.pow(a, q);
	    var m = s;
	    while (t.cmp(one) !== 0) {
	      var tmp = t;
	      for (var i = 0; tmp.cmp(one) !== 0; i++) {
	        tmp = tmp.redSqr();
	      }
	      assert(i < m);
	      var b = this.pow(c, new BN(1).iushln(m - i - 1));

	      r = r.redMul(b);
	      c = b.redSqr();
	      t = t.redMul(c);
	      m = i;
	    }

	    return r;
	  };

	  Red.prototype.invm = function invm (a) {
	    var inv = a._invmp(this.m);
	    if (inv.negative !== 0) {
	      inv.negative = 0;
	      return this.imod(inv).redNeg();
	    } else {
	      return this.imod(inv);
	    }
	  };

	  Red.prototype.pow = function pow (a, num) {
	    if (num.isZero()) return new BN(1);
	    if (num.cmpn(1) === 0) return a.clone();

	    var windowSize = 4;
	    var wnd = new Array(1 << windowSize);
	    wnd[0] = new BN(1).toRed(this);
	    wnd[1] = a;
	    for (var i = 2; i < wnd.length; i++) {
	      wnd[i] = this.mul(wnd[i - 1], a);
	    }

	    var res = wnd[0];
	    var current = 0;
	    var currentLen = 0;
	    var start = num.bitLength() % 26;
	    if (start === 0) {
	      start = 26;
	    }

	    for (i = num.length - 1; i >= 0; i--) {
	      var word = num.words[i];
	      for (var j = start - 1; j >= 0; j--) {
	        var bit = (word >> j) & 1;
	        if (res !== wnd[0]) {
	          res = this.sqr(res);
	        }

	        if (bit === 0 && current === 0) {
	          currentLen = 0;
	          continue;
	        }

	        current <<= 1;
	        current |= bit;
	        currentLen++;
	        if (currentLen !== windowSize && (i !== 0 || j !== 0)) continue;

	        res = this.mul(res, wnd[current]);
	        currentLen = 0;
	        current = 0;
	      }
	      start = 26;
	    }

	    return res;
	  };

	  Red.prototype.convertTo = function convertTo (num) {
	    var r = num.umod(this.m);

	    return r === num ? r.clone() : r;
	  };

	  Red.prototype.convertFrom = function convertFrom (num) {
	    var res = num.clone();
	    res.red = null;
	    return res;
	  };

	  //
	  // Montgomery method engine
	  //

	  BN.mont = function mont (num) {
	    return new Mont(num);
	  };

	  function Mont (m) {
	    Red.call(this, m);

	    this.shift = this.m.bitLength();
	    if (this.shift % 26 !== 0) {
	      this.shift += 26 - (this.shift % 26);
	    }

	    this.r = new BN(1).iushln(this.shift);
	    this.r2 = this.imod(this.r.sqr());
	    this.rinv = this.r._invmp(this.m);

	    this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
	    this.minv = this.minv.umod(this.r);
	    this.minv = this.r.sub(this.minv);
	  }
	  inherits(Mont, Red);

	  Mont.prototype.convertTo = function convertTo (num) {
	    return this.imod(num.ushln(this.shift));
	  };

	  Mont.prototype.convertFrom = function convertFrom (num) {
	    var r = this.imod(num.mul(this.rinv));
	    r.red = null;
	    return r;
	  };

	  Mont.prototype.imul = function imul (a, b) {
	    if (a.isZero() || b.isZero()) {
	      a.words[0] = 0;
	      a.length = 1;
	      return a;
	    }

	    var t = a.imul(b);
	    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
	    var u = t.isub(c).iushrn(this.shift);
	    var res = u;

	    if (u.cmp(this.m) >= 0) {
	      res = u.isub(this.m);
	    } else if (u.cmpn(0) < 0) {
	      res = u.iadd(this.m);
	    }

	    return res._forceRed(this);
	  };

	  Mont.prototype.mul = function mul (a, b) {
	    if (a.isZero() || b.isZero()) return new BN(0)._forceRed(this);

	    var t = a.mul(b);
	    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
	    var u = t.isub(c).iushrn(this.shift);
	    var res = u;
	    if (u.cmp(this.m) >= 0) {
	      res = u.isub(this.m);
	    } else if (u.cmpn(0) < 0) {
	      res = u.iadd(this.m);
	    }

	    return res._forceRed(this);
	  };

	  Mont.prototype.invm = function invm (a) {
	    // (AR)^-1 * R^2 = (A^-1 * R^-1) * R^2 = A^-1 * R
	    var res = this.imod(a._invmp(this.m).mul(this.r2));
	    return res._forceRed(this);
	  };
	})(module, commonjsGlobal);
} (bn$1));

/**
 * Returns a `Boolean` on whether or not the a `String` starts with '0x'
 * @param {String} str the string input value
 * @return {Boolean} a boolean if it is or is not hex prefixed
 * @throws if the str input is not a string
 */

var src$2 = function isHexPrefixed(str) {
  if (typeof str !== 'string') {
    throw new Error("[is-hex-prefixed] value must be type 'string', is currently type " + (typeof str) + ", while checking isHexPrefixed.");
  }

  return str.slice(0, 2) === '0x';
};

var isHexPrefixed = src$2;

/**
 * Removes '0x' from a given `String` is present
 * @param {String} str the string value
 * @return {String|Optional} a string by pass if necessary
 */
var src$1 = function stripHexPrefix(str) {
  if (typeof str !== 'string') {
    return str;
  }

  return isHexPrefixed(str) ? str.slice(2) : str;
};

var BN$1 = bn$1.exports;
var stripHexPrefix = src$1;

/**
 * Returns a BN object, converts a number value to a BN
 * @param {String|Number|Object} `arg` input a string number, hex string number, number, BigNumber or BN object
 * @return {Object} `output` BN object of the number
 * @throws if the argument is not an array, object that isn't a bignumber, not a string number or number
 */
var src = function numberToBN(arg) {
  if (typeof arg === 'string' || typeof arg === 'number') {
    var multiplier = new BN$1(1); // eslint-disable-line
    var formattedString = String(arg).toLowerCase().trim();
    var isHexPrefixed = formattedString.substr(0, 2) === '0x' || formattedString.substr(0, 3) === '-0x';
    var stringArg = stripHexPrefix(formattedString); // eslint-disable-line
    if (stringArg.substr(0, 1) === '-') {
      stringArg = stripHexPrefix(stringArg.slice(1));
      multiplier = new BN$1(-1, 10);
    }
    stringArg = stringArg === '' ? '0' : stringArg;

    if ((!stringArg.match(/^-?[0-9]+$/) && stringArg.match(/^[0-9A-Fa-f]+$/))
      || stringArg.match(/^[a-fA-F]+$/)
      || (isHexPrefixed === true && stringArg.match(/^[0-9A-Fa-f]+$/))) {
      return new BN$1(stringArg, 16).mul(multiplier);
    }

    if ((stringArg.match(/^-?[0-9]+$/) || stringArg === '') && isHexPrefixed === false) {
      return new BN$1(stringArg, 10).mul(multiplier);
    }
  } else if (typeof arg === 'object' && arg.toString && (!arg.pop && !arg.push)) {
    if (arg.toString(10).match(/^-?[0-9]+$/) && (arg.mul || arg.dividedToIntegerBy)) {
      return new BN$1(arg.toString(10), 10);
    }
  }

  throw new Error('[number-to-bn] while converting number ' + JSON.stringify(arg) + ' to BN.js instance, error: invalid number value. Value must be an integer, hex string, BN or BigNumber instance. Note, decimals are not supported.');
};

var BN = bn$2.exports;
var numberToBN = src;

var zero = new BN(0);
var negative1 = new BN(-1);

// complete ethereum unit map
var unitMap = {
  'noether': '0', // eslint-disable-line
  'wei': '1', // eslint-disable-line
  'kwei': '1000', // eslint-disable-line
  'Kwei': '1000', // eslint-disable-line
  'babbage': '1000', // eslint-disable-line
  'femtoether': '1000', // eslint-disable-line
  'mwei': '1000000', // eslint-disable-line
  'Mwei': '1000000', // eslint-disable-line
  'lovelace': '1000000', // eslint-disable-line
  'picoether': '1000000', // eslint-disable-line
  'gwei': '1000000000', // eslint-disable-line
  'Gwei': '1000000000', // eslint-disable-line
  'shannon': '1000000000', // eslint-disable-line
  'nanoether': '1000000000', // eslint-disable-line
  'nano': '1000000000', // eslint-disable-line
  'szabo': '1000000000000', // eslint-disable-line
  'microether': '1000000000000', // eslint-disable-line
  'micro': '1000000000000', // eslint-disable-line
  'finney': '1000000000000000', // eslint-disable-line
  'milliether': '1000000000000000', // eslint-disable-line
  'milli': '1000000000000000', // eslint-disable-line
  'ether': '1000000000000000000', // eslint-disable-line
  'kether': '1000000000000000000000', // eslint-disable-line
  'grand': '1000000000000000000000', // eslint-disable-line
  'mether': '1000000000000000000000000', // eslint-disable-line
  'gether': '1000000000000000000000000000', // eslint-disable-line
  'tether': '1000000000000000000000000000000' };

/**
 * Returns value of unit in Wei
 *
 * @method getValueOfUnit
 * @param {String} unit the unit to convert to, default ether
 * @returns {BigNumber} value of the unit (in Wei)
 * @throws error if the unit is not correct:w
 */
function getValueOfUnit(unitInput) {
  var unit = unitInput ? unitInput.toLowerCase() : 'ether';
  var unitValue = unitMap[unit]; // eslint-disable-line

  if (typeof unitValue !== 'string') {
    throw new Error('[ethjs-unit] the unit provided ' + unitInput + ' doesn\'t exists, please use the one of the following units ' + JSON.stringify(unitMap, null, 2));
  }

  return new BN(unitValue, 10);
}

function numberToString(arg) {
  if (typeof arg === 'string') {
    if (!arg.match(/^-?[0-9.]+$/)) {
      throw new Error('while converting number to string, invalid number value \'' + arg + '\', should be a number matching (^-?[0-9.]+).');
    }
    return arg;
  } else if (typeof arg === 'number') {
    return String(arg);
  } else if (typeof arg === 'object' && arg.toString && (arg.toTwos || arg.dividedToIntegerBy)) {
    if (arg.toPrecision) {
      return String(arg.toPrecision());
    } else {
      // eslint-disable-line
      return arg.toString(10);
    }
  }
  throw new Error('while converting number to string, invalid number value \'' + arg + '\' type ' + typeof arg + '.');
}

function fromWei(weiInput, unit, optionsInput) {
  var wei = numberToBN(weiInput); // eslint-disable-line
  var negative = wei.lt(zero); // eslint-disable-line
  var base = getValueOfUnit(unit);
  var baseLength = unitMap[unit].length - 1 || 1;
  var options = optionsInput || {};

  if (negative) {
    wei = wei.mul(negative1);
  }

  var fraction = wei.mod(base).toString(10); // eslint-disable-line

  while (fraction.length < baseLength) {
    fraction = '0' + fraction;
  }

  if (!options.pad) {
    fraction = fraction.match(/^([0-9]*[1-9]|0)(0*)/)[1];
  }

  var whole = wei.div(base).toString(10); // eslint-disable-line

  if (options.commify) {
    whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  var value = '' + whole + (fraction == '0' ? '' : '.' + fraction); // eslint-disable-line

  if (negative) {
    value = '-' + value;
  }

  return value;
}

function toWei(etherInput, unit) {
  var ether = numberToString(etherInput); // eslint-disable-line
  var base = getValueOfUnit(unit);
  var baseLength = unitMap[unit].length - 1 || 1;

  // Is it negative?
  var negative = ether.substring(0, 1) === '-'; // eslint-disable-line
  if (negative) {
    ether = ether.substring(1);
  }

  if (ether === '.') {
    throw new Error('[ethjs-unit] while converting number ' + etherInput + ' to wei, invalid value');
  }

  // Split it into a whole and fractional part
  var comps = ether.split('.'); // eslint-disable-line
  if (comps.length > 2) {
    throw new Error('[ethjs-unit] while converting number ' + etherInput + ' to wei,  too many decimal points');
  }

  var whole = comps[0],
      fraction = comps[1]; // eslint-disable-line

  if (!whole) {
    whole = '0';
  }
  if (!fraction) {
    fraction = '0';
  }
  if (fraction.length > baseLength) {
    throw new Error('[ethjs-unit] while converting number ' + etherInput + ' to wei, too many decimal places');
  }

  while (fraction.length < baseLength) {
    fraction += '0';
  }

  whole = new BN(whole);
  fraction = new BN(fraction);
  var wei = whole.mul(base).add(fraction); // eslint-disable-line

  if (negative) {
    wei = wei.mul(negative1);
  }

  return new BN(wei.toString(10), 10);
}

var lib = {
  unitMap: unitMap,
  numberToString: numberToString,
  getValueOfUnit: getValueOfUnit,
  fromWei: fromWei,
  toWei: toWei
};

Object.defineProperty(convert, "__esModule", { value: true });
convert.fromNano = convert.toNano = void 0;
const ethUnit = lib;
function toNano(src) {
    return ethUnit.toWei(src, 'gwei');
}
convert.toNano = toNano;
function fromNano(src) {
    return ethUnit.fromWei(src, 'gwei');
}
convert.fromNano = fromNano;

var __createBinding$1 = (undefined && undefined.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault$1 = (undefined && undefined.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar$1 = (undefined && undefined.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding$1(result, mod, k);
    __setModuleDefault$1(result, mod);
    return result;
};
var __classPrivateFieldSet = (undefined && undefined.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet$1 = (undefined && undefined.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault$9 = (undefined && undefined.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _KeyStore_salt, _KeyStore_publicKey, _KeyStore_records;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyStore = exports.createKeyStoreKey = void 0;
const ton_crypto_1$2 = require("ton-crypto");
const t$1 = __importStar$1(require("io-ts"));
const Either_1$1 = require("fp-ts/lib/Either");
const __1$1 = require("..");
const tweetnacl_1$2 = __importDefault$9(require("tweetnacl"));
const codec = t$1.type({
    version: t$1.number,
    salt: t$1.string,
    publicKey: t$1.string,
    records: t$1.array(t$1.type({
        name: t$1.string,
        address: t$1.string,
        kind: t$1.string,
        config: t$1.string,
        publicKey: t$1.string,
        secretKey: t$1.string,
        comment: t$1.string
    }))
});
async function createKeyStoreKey(password, salt) {
    let secretKey = await (0, ton_crypto_1$2.pbkdf2_sha512)(password, salt, 400000, 32);
    let r = tweetnacl_1$2.default.box.keyPair.fromSecretKey(secretKey);
    return {
        secretKey: Buffer.from(r.secretKey),
        publicKey: Buffer.from(r.publicKey)
    };
}
exports.createKeyStoreKey = createKeyStoreKey;
class KeyStore {
    constructor(src) {
        _KeyStore_salt.set(this, void 0);
        _KeyStore_publicKey.set(this, void 0);
        _KeyStore_records.set(this, new Map());
        this.checkPassword = async (password) => {
            let key = await createKeyStoreKey(password, Buffer.from(__classPrivateFieldGet$1(this, _KeyStore_salt, "f"), 'hex'));
            if (!key.publicKey.equals(Buffer.from(__classPrivateFieldGet$1(this, _KeyStore_publicKey, "f"), 'hex'))) {
                return false;
            }
            else {
                return true;
            }
        };
        this.hasKey = (name) => {
            return __classPrivateFieldGet$1(this, _KeyStore_records, "f").has(name);
        };
        this.getKey = (name) => {
            let ex = __classPrivateFieldGet$1(this, _KeyStore_records, "f").get(name);
            if (ex) {
                return {
                    name: ex.name,
                    address: ex.address,
                    kind: ex.kind,
                    config: ex.config,
                    comment: ex.comment,
                    publicKey: Buffer.from(ex.publicKey, 'hex')
                };
            }
            return null;
        };
        this.getSecret = async (name, password) => {
            if (!__classPrivateFieldGet$1(this, _KeyStore_records, "f").has(name)) {
                throw Error('Key with name ' + name + ' does not exist');
            }
            let record = __classPrivateFieldGet$1(this, _KeyStore_records, "f").get(name);
            let src = Buffer.from(record.secretKey, 'hex');
            let nonce = src.slice(0, 24);
            let publicKey = src.slice(24, 24 + 32);
            let data = src.slice(24 + 32);
            // Derive key
            let key = await createKeyStoreKey(password, Buffer.from(__classPrivateFieldGet$1(this, _KeyStore_salt, "f"), 'hex'));
            if (!key.publicKey.equals(Buffer.from(__classPrivateFieldGet$1(this, _KeyStore_publicKey, "f"), 'hex'))) {
                throw Error('Invalid password');
            }
            // Decode
            let decoded = tweetnacl_1$2.default.box.open(data, nonce, publicKey, key.secretKey);
            if (!decoded) {
                throw Error('Invalid password');
            }
            return Buffer.from(decoded);
        };
        this.addKey = async (record, key) => {
            if (__classPrivateFieldGet$1(this, _KeyStore_records, "f").has(record.name)) {
                throw Error('Key with name ' + record.name + ' already exists');
            }
            // Create key
            let ephemeralKeySecret = await (0, ton_crypto_1$2.getSecureRandomBytes)(32);
            let ephemeralKeyPublic = Buffer.from((tweetnacl_1$2.default.box.keyPair.fromSecretKey(ephemeralKeySecret)).publicKey);
            let nonce = await (0, ton_crypto_1$2.getSecureRandomBytes)(24);
            let encrypted = tweetnacl_1$2.default.box(key, nonce, Buffer.from(__classPrivateFieldGet$1(this, _KeyStore_publicKey, "f"), 'hex'), ephemeralKeySecret);
            let data = Buffer.concat([nonce, ephemeralKeyPublic, encrypted]);
            // Create record
            let rec = {
                name: record.name,
                address: record.address,
                kind: record.kind,
                config: record.config,
                comment: record.comment,
                publicKey: record.publicKey.toString('hex'),
                secretKey: data.toString('hex')
            };
            Object.freeze(rec);
            __classPrivateFieldGet$1(this, _KeyStore_records, "f").set(record.name, rec);
        };
        this.removeKey = (name) => {
            if (!__classPrivateFieldGet$1(this, _KeyStore_records, "f").has(name)) {
                throw Error('Key with name ' + name + ' does not exist');
            }
            __classPrivateFieldGet$1(this, _KeyStore_records, "f").delete(name);
        };
        if (src.version !== 1) {
            throw Error('Unsupported keystore');
        }
        __classPrivateFieldSet(this, _KeyStore_salt, src.salt, "f");
        __classPrivateFieldSet(this, _KeyStore_publicKey, src.publicKey, "f");
        for (let r of src.records) {
            if (__classPrivateFieldGet$1(this, _KeyStore_records, "f").has(r.name)) {
                throw Error('Broken keystore');
            }
            const record = {
                name: r.name,
                address: __1$1.Address.parseRaw(r.address),
                kind: r.kind,
                config: r.config,
                comment: r.comment,
                publicKey: r.publicKey,
                secretKey: r.secretKey
            };
            Object.freeze(record);
            __classPrivateFieldGet$1(this, _KeyStore_records, "f").set(r.name, record);
        }
    }
    static async createNew(password) {
        let salt = await (0, ton_crypto_1$2.getSecureRandomBytes)(32);
        let key = await createKeyStoreKey(password, salt);
        return new KeyStore({ version: 1, salt: salt.toString('hex'), publicKey: key.publicKey.toString('hex'), records: [] });
    }
    static async load(source) {
        // Validate checksum
        if (source.length < 32) {
            throw Error('Broken keystore');
        }
        let hash = source.slice(0, 32);
        let data = source.slice(32);
        let hash2 = await (0, ton_crypto_1$2.sha256)(data);
        if (!hash.equals(hash2)) { // We don't care about timing attacks here
            throw Error('Broken keystore');
        }
        // Parse storage
        let parsed = JSON.parse(data.toString('utf-8'));
        let decoded = codec.decode(parsed);
        if ((0, Either_1$1.isLeft)(decoded)) {
            throw Error('Broken keystore');
        }
        return new KeyStore(decoded.right);
    }
    get allKeys() {
        let res = [];
        for (let k of __classPrivateFieldGet$1(this, _KeyStore_records, "f").keys()) {
            let r = __classPrivateFieldGet$1(this, _KeyStore_records, "f").get(k);
            res.push({
                name: r.name,
                address: r.address,
                kind: r.kind,
                config: r.config,
                comment: r.comment,
                publicKey: Buffer.from(r.publicKey, 'hex')
            });
        }
        return res;
    }
    async save() {
        let store = {
            version: 1,
            salt: __classPrivateFieldGet$1(this, _KeyStore_salt, "f"),
            publicKey: __classPrivateFieldGet$1(this, _KeyStore_publicKey, "f"),
            records: Array.from(__classPrivateFieldGet$1(this, _KeyStore_records, "f").entries()).map((v) => ({
                name: v[1].name,
                address: v[1].address.toString(),
                kind: v[1].kind,
                config: v[1].config,
                comment: v[1].comment,
                publicKey: v[1].publicKey,
                secretKey: v[1].secretKey
            }))
        };
        let data = Buffer.from(JSON.stringify(store), 'utf-8');
        let hash = await (0, ton_crypto_1$2.sha256)(data);
        return Buffer.concat([hash, data]);
    }
}
exports.KeyStore = KeyStore;
_KeyStore_salt = new WeakMap(), _KeyStore_publicKey = new WeakMap(), _KeyStore_records = new WeakMap();

var KeyStore$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$7$1 = /*@__PURE__*/getAugmentedNamespace(KeyStore$1);

var SendMode = {};

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.SendMode = void 0;
	(function (SendMode) {
	    SendMode[SendMode["CARRRY_ALL_REMAINING_BALANCE"] = 128] = "CARRRY_ALL_REMAINING_BALANCE";
	    SendMode[SendMode["CARRRY_ALL_REMAINING_INCOMING_VALUE"] = 64] = "CARRRY_ALL_REMAINING_INCOMING_VALUE";
	    SendMode[SendMode["DESTROY_ACCOUNT_IF_ZERO"] = 32] = "DESTROY_ACCOUNT_IF_ZERO";
	    SendMode[SendMode["PAY_GAS_SEPARATLY"] = 1] = "PAY_GAS_SEPARATLY";
	    SendMode[SendMode["IGNORE_ERRORS"] = 2] = "IGNORE_ERRORS";
	})(exports.SendMode || (exports.SendMode = {}));
} (SendMode));

var TonCache = {};

Object.defineProperty(TonCache, "__esModule", { value: true });
TonCache.InMemoryCache = void 0;
class InMemoryCache {
    constructor() {
        this.cache = new Map();
        this.set = async (namespace, key, value) => {
            if (value !== null) {
                this.cache.set(namespace + '$$' + key, value);
            }
            else {
                this.cache.delete(namespace + '$$' + key);
            }
        };
        this.get = async (namespace, key) => {
            let res = this.cache.get(namespace + '$$' + key);
            if (res !== undefined) {
                return res;
            }
            else {
                return null;
            }
        };
    }
}
TonCache.InMemoryCache = InMemoryCache;

var __createBinding = (undefined && undefined.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (undefined && undefined.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (undefined && undefined.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault$8 = (undefined && undefined.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpApi = void 0;
const t = __importStar(require("io-ts"));
const Either_1 = require("fp-ts/lib/Either");
const io_ts_reporters_1 = __importDefault$8(require("io-ts-reporters"));
const dataloader_1 = __importDefault$8(require("dataloader"));
const axios_1 = __importDefault$8(require("axios"));
const version = require('../../../package.json').version;
const blockIdExt = t.type({
    '@type': t.literal('ton.blockIdExt'),
    workchain: t.number,
    shard: t.string,
    seqno: t.number,
    root_hash: t.string,
    file_hash: t.string
});
const addressInformation = t.type({
    balance: t.union([t.number, t.string]),
    state: t.union([t.literal('active'), t.literal('uninitialized'), t.literal('frozen')]),
    data: t.string,
    code: t.string,
    last_transaction_id: t.type({
        '@type': t.literal('internal.transactionId'),
        lt: t.string,
        hash: t.string
    }),
    block_id: blockIdExt,
    sync_utime: t.number
});
const bocResponse = t.type({
    '@type': t.literal('ok')
});
const feeResponse = t.type({
    '@type': t.literal('query.fees'),
    source_fees: t.type({
        '@type': t.literal('fees'),
        in_fwd_fee: t.number,
        storage_fee: t.number,
        gas_fee: t.number,
        fwd_fee: t.number
    })
});
const callGetMethod = t.type({
    gas_used: t.number,
    exit_code: t.number,
    stack: t.array(t.unknown)
});
const messageData = t.union([
    t.type({
        '@type': t.literal('msg.dataRaw'),
        'body': t.string
    }),
    t.type({
        '@type': t.literal('msg.dataText'),
        'text': t.string
    }),
    t.type({
        '@type': t.literal('msg.dataDecryptedText'),
        'text': t.string
    }),
    t.type({
        '@type': t.literal('msg.dataEncryptedText'),
        'text': t.string
    })
]);
const message = t.type({
    source: t.string,
    destination: t.string,
    value: t.string,
    fwd_fee: t.string,
    ihr_fee: t.string,
    created_lt: t.string,
    body_hash: t.string,
    msg_data: messageData
});
const transaction = t.type({
    data: t.string,
    utime: t.number,
    transaction_id: t.type({
        lt: t.string,
        hash: t.string
    }),
    fee: t.string,
    storage_fee: t.string,
    other_fee: t.string,
    in_msg: t.union([t.undefined, message]),
    out_msgs: t.array(message)
});
const getTransactions = t.array(transaction);
const getMasterchain = t.type({
    state_root_hash: t.string,
    last: blockIdExt,
    init: blockIdExt
});
const getShards = t.type({
    shards: t.array(blockIdExt)
});
const blockShortTxt = t.type({
    '@type': t.literal('blocks.shortTxId'),
    mode: t.number,
    account: t.string,
    lt: t.string,
    hash: t.string
});
const getBlockTransactions = t.type({
    id: blockIdExt,
    req_count: t.number,
    incomplete: t.boolean,
    transactions: t.array(blockShortTxt)
});
class TypedCache {
    constructor(namespace, cache, codec, keyEncoder) {
        this.namespace = namespace;
        this.cache = cache;
        this.codec = codec;
        this.keyEncoder = keyEncoder;
    }
    async get(key) {
        let ex = await this.cache.get(this.namespace, this.keyEncoder(key));
        if (ex) {
            let decoded = this.codec.decode(JSON.parse(ex));
            if ((0, Either_1.isRight)(decoded)) {
                return decoded.right;
            }
        }
        return null;
    }
    async set(key, value) {
        if (value !== null) {
            await this.cache.set(this.namespace, this.keyEncoder(key), JSON.stringify(value));
        }
        else {
            await this.cache.set(this.namespace, this.keyEncoder(key), null);
        }
    }
}
class HttpApi {
    constructor(endpoint, cache, parameters) {
        this.endpoint = endpoint;
        this.cache = cache;
        this.parameters = {
            timeout: (parameters === null || parameters === void 0 ? void 0 : parameters.timeout) || 30000,
            apiKey: parameters === null || parameters === void 0 ? void 0 : parameters.apiKey
        };
        // Shard
        this.shardCache = new TypedCache('ton-shard', cache, t.array(blockIdExt), (src) => src + '');
        this.shardLoader = new dataloader_1.default(async (src) => {
            return await Promise.all(src.map(async (v) => {
                const cached = await this.shardCache.get(v);
                if (cached) {
                    return cached;
                }
                let loaded = (await this.doCall('shards', { seqno: v }, getShards)).shards;
                await this.shardCache.set(v, loaded);
                return loaded;
            }));
        });
        // Shard Transactions
        this.shardTransactionsCache = new TypedCache('ton-shard-tx', cache, getBlockTransactions, (src) => src.workchain + ':' + src.shard + ':' + src.seqno);
        this.shardTransactionsLoader = new dataloader_1.default(async (src) => {
            return await Promise.all(src.map(async (v) => {
                const cached = await this.shardTransactionsCache.get(v);
                if (cached) {
                    return cached;
                }
                let loaded = await this.doCall('getBlockTransactions', { workchain: v.workchain, seqno: v.seqno, shard: v.shard }, getBlockTransactions);
                await this.shardTransactionsCache.set(v, loaded);
                return loaded;
            }));
        }, { cacheKeyFn: (src) => src.workchain + ':' + src.shard + ':' + src.seqno });
    }
    getAddressInformation(address) {
        return this.doCall('getAddressInformation', { address: address.toString() }, addressInformation);
    }
    async getTransactions(address, opts) {
        const inclusive = opts.inclusive;
        delete opts.inclusive;
        // Convert hash
        let hash = undefined;
        if (opts.hash) {
            hash = Buffer.from(opts.hash, 'base64').toString('hex');
        }
        // Adjust limit
        let limit = opts.limit;
        if (opts.hash && opts.lt && inclusive !== true) {
            limit++;
        }
        // Do request
        let res = await this.doCall('getTransactions', { address: address.toString(), ...opts, limit, hash }, getTransactions);
        if (res.length > limit) {
            res = res.slice(0, limit);
        }
        // Adjust result
        if (opts.hash && opts.lt && inclusive !== true) {
            res.shift();
            return res;
        }
        else {
            return res;
        }
    }
    async getMasterchainInfo() {
        return await this.doCall('getMasterchainInfo', {}, getMasterchain);
    }
    async getShards(seqno) {
        return await this.shardLoader.load(seqno);
    }
    async getBlockTransactions(workchain, seqno, shard) {
        return await this.shardTransactionsLoader.load({ workchain, seqno, shard });
    }
    async getTransaction(address, lt, hash) {
        let convHash = Buffer.from(hash, 'base64').toString('hex');
        let res = await this.doCall('getTransactions', { address: address.toString(), lt, hash: convHash, limit: 1 }, getTransactions);
        let ex = res.find((v) => v.transaction_id.lt === lt && v.transaction_id.hash === hash);
        if (ex) {
            return ex;
        }
        else {
            return null;
        }
    }
    async callGetMethod(address, method, params) {
        return await this.doCall('runGetMethod', { address: address.toString(), method, stack: params }, callGetMethod);
    }
    async sendBoc(body) {
        await this.doCall('sendBoc', { boc: body.toString('base64') }, bocResponse);
    }
    async estimateFee(address, args) {
        return await this.doCall('estimateFee', {
            address: address.toFriendly(),
            body: (await args.body.toBoc({ idx: false })).toString('base64'),
            'init_data': args.initData ? (await args.initData.toBoc({ idx: false })).toString('base64') : '',
            'init_code': args.initCode ? (await args.initCode.toBoc({ idx: false })).toString('base64') : '',
            ignore_chksig: args.ignoreSignature
        }, feeResponse);
    }
    async doCall(method, body, codec) {
        let headers = {
            'Content-Type': 'application/json',
            'X-Ton-Client-Version': version,
        };
        if (this.parameters.apiKey) {
            headers['X-API-Key'] = this.parameters.apiKey;
        }
        let res = await axios_1.default.post(this.endpoint, JSON.stringify({
            id: '1',
            jsonrpc: '2.0',
            method: method,
            params: body
        }), {
            headers,
            timeout: this.parameters.timeout,
        });
        if (res.status !== 200 || !res.data.ok) {
            throw Error('Received error: ' + JSON.stringify(res.data));
        }
        let decoded = codec.decode(res.data.result);
        if ((0, Either_1.isRight)(decoded)) {
            return decoded.right;
        }
        else {
            throw Error('Malformed response: ' + io_ts_reporters_1.default.report(decoded).join(', '));
        }
    }
}
exports.HttpApi = HttpApi;

var HttpApi$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$10 = /*@__PURE__*/getAugmentedNamespace(HttpApi$1);

var Slice = {};

var hasRequiredSlice;

function requireSlice () {
	if (hasRequiredSlice) return Slice;
	hasRequiredSlice = 1;
	Object.defineProperty(Slice, "__esModule", { value: true });
	Slice.Slice = void 0;
	const __1 = requireDist();
	let Slice$1 = class Slice {
	    constructor(sourceBits, sourceRefs) {
	        this.refs = [];
	        this.skip = (bits) => {
	            this.bits.skip(bits);
	        };
	        this.readUint = (bits) => {
	            return this.bits.readUint(bits);
	        };
	        this.readUintNumber = (bits) => {
	            return this.bits.readUintNumber(bits);
	        };
	        this.readInt = (bits) => {
	            return this.bits.readInt(bits);
	        };
	        this.readIntNumber = (bits) => {
	            return this.bits.readIntNumber(bits);
	        };
	        this.readBuffer = (size) => {
	            return this.bits.readBuffer(size);
	        };
	        this.readBit = () => {
	            return this.bits.readBit();
	        };
	        this.readCoins = () => {
	            return this.bits.readCoins();
	        };
	        this.readVarUInt = (headerBits) => {
	            return this.bits.readVarUInt(headerBits);
	        };
	        this.readVarUIntNumber = (headerBits) => {
	            return this.bits.readVarUIntNumber(headerBits);
	        };
	        this.readRemaining = () => {
	            return this.bits.readRemaining();
	        };
	        this.readRemainingBytes = () => {
	            if (this.bits.remaining % 8 !== 0) {
	                throw Error('Number remaining of bits is not multiply of 8');
	            }
	            return this.bits.readBuffer(this.bits.remaining / 8);
	        };
	        this.readAddress = () => {
	            return this.bits.readAddress();
	        };
	        this.readUnaryLength = () => {
	            return this.bits.readUnaryLength();
	        };
	        this.readOptDict = (keySize, extractor) => {
	            if (this.readBit()) {
	                return this.readDict(keySize, extractor);
	            }
	            else {
	                return null;
	            }
	        };
	        this.readDict = (keySize, extractor) => {
	            let first = this.refs.shift();
	            if (first) {
	                return (0, __1.parseDict)(first.beginParse(), keySize, extractor);
	            }
	            else {
	                throw Error('No ref');
	            }
	        };
	        this.readRef = () => {
	            let first = this.refs.shift();
	            if (first) {
	                return Slice$1.fromCell(first);
	            }
	            else {
	                throw Error('No ref');
	            }
	        };
	        this.readCell = () => {
	            let first = this.refs.shift();
	            if (first) {
	                return first;
	            }
	            else {
	                throw Error('No ref');
	            }
	        };
	        this.clone = () => {
	            // Copy remaining
	            const cloned = this.sourceBits.clone();
	            const reader = new __1.BitStringReader(cloned);
	            reader.skip(this.bits.currentOffset);
	            const remaining = reader.readRemaining();
	            const remainingRefs = [...this.refs];
	            // Build slice
	            return new Slice$1(remaining, remainingRefs);
	        };
	        this.toCell = () => {
	            // Copy remaining
	            const cloned = this.sourceBits.clone();
	            const reader = new __1.BitStringReader(cloned);
	            reader.skip(this.bits.currentOffset);
	            const remaining = reader.readRemaining();
	            let cell = new __1.Cell(false, remaining);
	            for (let r of this.refs) {
	                cell.refs.push(r);
	            }
	            return cell;
	        };
	        this.sourceBits = sourceBits.clone();
	        this.refs = [...sourceRefs];
	        this.bits = new __1.BitStringReader(this.sourceBits);
	    }
	    static fromCell(cell) {
	        return new Slice$1(cell.bits, cell.refs);
	    }
	    get remaining() {
	        return this.bits.remaining;
	    }
	    get remainingRefs() {
	        return this.refs.length;
	    }
	};
	Slice.Slice = Slice$1;
	return Slice;
}

var __importDefault$7 = (undefined && undefined.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADNLAddress = void 0;
const symbol_inspect_1 = __importDefault$7(require("symbol.inspect"));
const base32_1 = require("../utils/base32");
const crc16_1 = require("../utils/crc16");
class ADNLAddress {
    constructor(address) {
        this.toString = () => {
            return this.toFriendly();
        };
        this.toRaw = () => {
            return this.address.toString('hex').toUpperCase();
        };
        this.toFriendly = () => {
            let data = Buffer.concat([Buffer.from([0x2D]), this.address]);
            let hash = (0, crc16_1.crc16)(data);
            data = Buffer.concat([data, hash]);
            return (0, base32_1.base32Encode)(data).slice(1);
        };
        this[_a] = () => this.toFriendly();
        if (address.length !== 32) {
            throw Error('Invalid address');
        }
        this.address = address;
    }
    static parseFriendly(src) {
        if (src.length !== 55) {
            throw Error('Invalid address');
        }
        // Decoding
        src = 'f' + src;
        let decoded = (0, base32_1.base32Decode)(src);
        if (decoded[0] !== 0x2d) {
            throw Error('Invalid address');
        }
        let gotHash = decoded.slice(33);
        let hash = (0, crc16_1.crc16)(decoded.slice(0, 33));
        if (!hash.equals(gotHash)) {
            throw Error('Invalid address');
        }
        return new ADNLAddress(decoded.slice(1, 33));
    }
    static parseRaw(src) {
        const data = Buffer.from(src, 'base64');
        return new ADNLAddress(data);
    }
    equals(b) {
        return this.address.equals(b.address);
    }
}
exports.ADNLAddress = ADNLAddress;
_a = symbol_inspect_1.default;

var ADNLAddress$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$12 = /*@__PURE__*/getAugmentedNamespace(ADNLAddress$1);

Object.defineProperty(exports, "__esModule", { value: true });
exports.ADNLKey = void 0;
const ton_crypto_1$1 = require("ton-crypto");
const ADNLAddress_1 = require("../address/ADNLAddress");
const KEY_PREFIX = Buffer.from('17236849', 'hex');
class ADNLKey {
    constructor(address, keyPair) {
        this.address = address;
        this.keyPair = keyPair;
    }
    static async fromKey(src) {
        if (src.length !== 36) {
            throw Error('Invalid key');
        }
        if (!src.slice(0, 4).equals(KEY_PREFIX)) {
            throw Error('Invalid key');
        }
        const keySeed = src.slice(4);
        // Create keypair
        const keyPair = (0, ton_crypto_1$1.keyPairFromSeed)(keySeed);
        // Create address
        const address = await (0, ton_crypto_1$1.sha256)(Buffer.concat([Buffer.from([0xC6, 0xB4, 0x13, 0x48]), keyPair.publicKey]));
        return new ADNLKey(new ADNLAddress_1.ADNLAddress(address), keyPair);
    }
}
exports.ADNLKey = ADNLKey;

var ADNLKey$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$13 = /*@__PURE__*/getAugmentedNamespace(ADNLKey$1);

var Builder$1 = {};

Object.defineProperty(Builder$1, "__esModule", { value: true });
Builder$1.beginCell = Builder$1.Builder = void 0;
const BitString_1 = require$$0$4;
const Cell_1$4 = require$$2$1;
class Builder {
    constructor() {
        this.bits = BitString_1.BitString.alloc(1023);
        this.refs = [];
        this.ended = false;
        this.storeRef = (src) => {
            if (this.ended) {
                throw Error('Already ended');
            }
            this.refs.push(src);
            return this;
        };
        this.storeBit = (value) => {
            if (this.ended) {
                throw Error('Already ended');
            }
            this.bits.writeBit(value);
            return this;
        };
        this.storeBitArray = (value) => {
            if (this.ended) {
                throw Error('Already ended');
            }
            this.bits.writeBitArray(value);
            return this;
        };
        this.storeUint = (value, bitLength) => {
            if (this.ended) {
                throw Error('Already ended');
            }
            this.bits.writeUint(value, bitLength);
            return this;
        };
        this.storeInt = (value, bitLength) => {
            if (this.ended) {
                throw Error('Already ended');
            }
            this.bits.writeInt(value, bitLength);
            return this;
        };
        this.storeUint8 = (value) => {
            if (this.ended) {
                throw Error('Already ended');
            }
            this.bits.writeUint8(value);
            return this;
        };
        this.storeBuffer = (buffer) => {
            if (this.ended) {
                throw Error('Already ended');
            }
            this.bits.writeBuffer(buffer);
            return this;
        };
        this.storeCoins = (amount) => {
            if (this.ended) {
                throw Error('Already ended');
            }
            this.bits.writeCoins(amount);
            return this;
        };
        this.storeAddress = (address) => {
            if (this.ended) {
                throw Error('Already ended');
            }
            this.bits.writeAddress(address);
            return this;
        };
        this.storeBitString = (value) => {
            if (this.ended) {
                throw Error('Already ended');
            }
            this.bits.writeBitString(value);
            return this;
        };
        this.storeDict = (src) => {
            if (this.ended) {
                throw Error('Already ended');
            }
            if (src) {
                this.bits.writeBit(true);
                this.refs.push(src);
            }
            else {
                this.bits.writeBit(false);
            }
            return this;
        };
        this.storeRefMaybe = (src) => {
            return this.storeDict(src);
        };
    }
    endCell() {
        if (this.ended) {
            throw Error('Already ended');
        }
        this.ended = true;
        let res = new Cell_1$4.Cell(false, this.bits);
        for (let r of this.refs) {
            res.refs.push(r);
        }
        return res;
    }
}
Builder$1.Builder = Builder;
function beginCell() {
    return new Builder();
}
Builder$1.beginCell = beginCell;

var __importDefault$6 = (undefined && undefined.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.beginDict = exports.DictBuilder = void 0;
const bn_js_1$4 = __importDefault$6(require("bn.js"));
const Builder_1 = require("./Builder");
const serializeDict_1 = require("./dict/serializeDict");
class DictBuilder {
    constructor(keySize) {
        this.items = new Map();
        this.ended = false;
        this.storeCell = (index, value) => {
            if (this.ended) {
                throw Error('Already ended');
            }
            let key;
            if (typeof index === 'number') {
                key = index.toString(10);
            }
            else if (bn_js_1$4.default.isBN(index)) {
                key = index.toString(10);
            }
            else if (Buffer.isBuffer(index)) {
                key = new bn_js_1$4.default(index.toString('hex'), 'hex').toString(10);
            }
            else {
                throw Error('Invalid index type');
            }
            if (this.items.has(key)) {
                throw Error('Item ' + index + ' already exist');
            }
            this.items.set(key, value);
        };
        this.storeRef = (index, value) => {
            if (this.ended) {
                throw Error('Already ended');
            }
            this.storeCell(index, (0, Builder_1.beginCell)()
                .storeRef(value)
                .endCell());
        };
        this.endDict = () => {
            if (this.ended) {
                throw Error('Already ended');
            }
            this.ended = true;
            if (this.items.size === 0) {
                return null;
            }
            return (0, serializeDict_1.serializeDict)(this.items, this.keySize, (src, dst) => dst.writeCell(src));
        };
        this.endCell = () => {
            if (this.ended) {
                throw Error('Already ended');
            }
            if (this.items.size === 0) {
                throw Error('Dict is empty');
            }
            return this.endDict();
        };
        this.keySize = keySize;
    }
}
exports.DictBuilder = DictBuilder;
function beginDict(keyLength) {
    return new DictBuilder(keyLength);
}
exports.beginDict = beginDict;

var DictBuilder$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$15 = /*@__PURE__*/getAugmentedNamespace(DictBuilder$1);

Object.defineProperty(exports, "__esModule", { value: true });
exports.bnToAddress = void 0;
const Address_1 = require("../address/Address");
function bnToAddress(chain, bn) {
    let r = bn.toString("hex");
    while (r.length < 64) {
        r = "0" + r;
    }
    return new Address_1.Address(chain, Buffer.from(r, "hex"));
}
exports.bnToAddress = bnToAddress;

var bnToAddress$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$16 = /*@__PURE__*/getAugmentedNamespace(bnToAddress$1);

Object.defineProperty(exports, "__esModule", { value: true });
exports.TupleSlice = void 0;
const bn_js_1$3 = require("bn.js");
const bnToAddress_1 = require("../utils/bnToAddress");
const Cell_1$3 = require("./Cell");
class TupleSlice {
    constructor(items) {
        this.items = [...items];
    }
    get remaining() {
        return this.items.length;
    }
    readNumber() {
        if (this.items[0][0] !== 'num') {
            throw Error('Not a number');
        }
        let res = parseInt(this.items[0][1]);
        this.items.splice(0, 1);
        return res;
    }
    readBoolean() {
        if (this.items[0][0] !== 'num') {
            throw Error('Not a number');
        }
        let res = parseInt(this.items[0][1]);
        this.items.splice(0, 1);
        return res === 0 ? false : true;
    }
    readBigNumber() {
        if (this.items[0][0] !== 'num') {
            throw Error('Not a number');
        }
        let res = new bn_js_1$3.BN(this.items[0][1].slice(2), 'hex');
        this.items.splice(0, 1);
        return res;
    }
    readCell() {
        if (this.items[0][0] !== 'cell') {
            throw Error('Not a cell');
        }
        let res = Cell_1$3.Cell.fromBoc(Buffer.from(this.items[0][1].bytes, 'base64'))[0];
        this.items.splice(0, 1);
        return res;
    }
    readNumericAddress(chain) {
        if (this.items[0][0] !== 'num') {
            throw Error('Not a number');
        }
        let bn = this.readBigNumber();
        return (0, bnToAddress_1.bnToAddress)(chain, bn);
    }
}
exports.TupleSlice = TupleSlice;

var TupleSlice$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$17 = /*@__PURE__*/getAugmentedNamespace(TupleSlice$1);

var getSupportedInterfaces$1 = {};

Object.defineProperty(getSupportedInterfaces$1, "__esModule", { value: true });
getSupportedInterfaces$1.getSupportedInterfaces = getSupportedInterfaces$1.getSupportedInterfacesRaw = getSupportedInterfaces$1.resolveKnownInterface = void 0;
const TupleSlice_1 = require$$17;
const known = {
    ['123515602279859691144772641439386770278']: 'org.ton.introspection.v0',
    ['256184278959413194623484780286929323492']: 'com.tonwhales.nominators:v0'
};
/**
 * Resolves known interface
 * @param src source id
 * @returns known interface
 */
function resolveKnownInterface(src) {
    let kn = known[src];
    if (kn) {
        return kn;
    }
    else {
        return null;
    }
}
getSupportedInterfaces$1.resolveKnownInterface = resolveKnownInterface;
/**
 * Fetching supported interfaces
 * @param src address
 * @param client client
 * @returns array of supported interfaces
 */
async function getSupportedInterfacesRaw(src, client) {
    // Query interfaces
    let res = await client.callGetMethodWithError(src, 'supported_interfaces');
    // If not successful: return empty
    if (res.exit_code !== 0 && res.exit_code !== 1) {
        return [];
    }
    try {
        let slice = new TupleSlice_1.TupleSlice(res.stack);
        // First interface have to be introspection
        let firstNumber = slice.readBigNumber().toString();
        if (firstNumber !== '123515602279859691144772641439386770278') {
            return [];
        }
        // Read all remaining
        let interfaces = [];
        while (slice.remaining > 0) {
            interfaces.push(slice.readBigNumber().toString());
        }
        return interfaces;
    }
    catch (e) {
        // In case of error: exit
        console.warn(e);
        return [];
    }
}
getSupportedInterfaces$1.getSupportedInterfacesRaw = getSupportedInterfacesRaw;
/**
 * Fetching supported interfaces
 * @param src address
 * @param client client
 * @returns array of supported interfaces
 */
async function getSupportedInterfaces(src, client) {
    let supprotedRaw = await getSupportedInterfacesRaw(src, client);
    return supprotedRaw.map((v) => {
        let k = resolveKnownInterface(v);
        if (k) {
            return { type: 'known', name: k };
        }
        else {
            return { type: 'unknown', value: v };
        }
    });
}
getSupportedInterfaces$1.getSupportedInterfaces = getSupportedInterfaces;

var parseSupportedMessage$1 = {};

Object.defineProperty(exports, "__esModule", { value: true });
exports.crc32str = exports.crc32 = void 0;
const POLYNOMIAL = -306674912;
let crc32_table = undefined;
function calcTable() {
    crc32_table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
        let r = i;
        for (let bit = 8; bit > 0; --bit)
            r = ((r & 1) ? ((r >>> 1) ^ POLYNOMIAL) : (r >>> 1));
        crc32_table[i] = r;
    }
}
function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    if (crc32_table === undefined) {
        calcTable();
    }
    for (let i = 0; i < bytes.length; ++i)
        crc = crc32_table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ -1) >>> 0;
}
exports.crc32 = crc32;
function crc32str(src) {
    return crc32(Buffer.from(src));
}
exports.crc32str = crc32str;

var crc32$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$0$3 = /*@__PURE__*/getAugmentedNamespace(crc32$1);

Object.defineProperty(parseSupportedMessage$1, "__esModule", { value: true });
parseSupportedMessage$1.parseSupportedMessage = void 0;
const crc32_1 = require$$0$3;
function parseNominatorsMessage(op, sc) {
    // Deposit
    if (op === (0, crc32_1.crc32str)('op::stake_deposit')) {
        let queryId = sc.readUint(64);
        let gasLimit = sc.readCoins().toNumber();
        return {
            type: 'deposit',
            data: {
                'query_id': queryId,
                'gas_limit': gasLimit
            }
        };
    }
    if (op === (0, crc32_1.crc32str)('op::stake_deposit::response')) {
        return {
            type: 'deposit::ok',
            data: {}
        };
    }
    // Withdraw
    if (op === (0, crc32_1.crc32str)('op::stake_withdraw')) {
        let queryId = sc.readUint(64);
        let gasLimit = sc.readCoins().toNumber();
        const stake = sc.readCoins();
        return {
            type: 'withdraw',
            data: {
                'stake': stake,
                'query_id': queryId,
                'gas_limit': gasLimit
            }
        };
    }
    if (op === (0, crc32_1.crc32str)('op::stake_withdraw::delayed')) {
        return {
            type: 'withdraw::delayed',
            data: {}
        };
    }
    if (op === (0, crc32_1.crc32str)('op::stake_withdraw::response')) {
        return {
            type: 'withdraw::ok',
            data: {}
        };
    }
    // Upgrade
    if (op === (0, crc32_1.crc32str)('op::upgrade')) {
        let queryId = sc.readUint(64);
        let gasLimit = sc.readCoins().toNumber();
        const code = sc.readCell();
        return {
            type: 'upgrade',
            data: {
                'code': code,
                'query_id': queryId,
                'gas_limit': gasLimit
            }
        };
    }
    if (op === (0, crc32_1.crc32str)('op::upgrade::response')) {
        return {
            type: 'upgrade::ok',
            data: {}
        };
    }
    // Upgrade
    if (op === (0, crc32_1.crc32str)('op::upgrade')) {
        let queryId = sc.readUint(64);
        let gasLimit = sc.readCoins().toNumber();
        const code = sc.readCell();
        return {
            type: 'upgrade',
            data: {
                'code': code,
                'query_id': queryId,
                'gas_limit': gasLimit
            }
        };
    }
    if (op === (0, crc32_1.crc32str)('op::upgrade::ok')) {
        return {
            type: 'upgrade::ok',
            data: {}
        };
    }
    // Update
    if (op === (0, crc32_1.crc32str)('op::update')) {
        let queryId = sc.readUint(64);
        let gasLimit = sc.readCoins().toNumber();
        const params = sc.readCell();
        return {
            type: 'update',
            data: {
                'code': params,
                'query_id': queryId,
                'gas_limit': gasLimit
            }
        };
    }
    if (op === (0, crc32_1.crc32str)('op::update::ok')) {
        return {
            type: 'update::ok',
            data: {}
        };
    }
    return null;
}
function parseSupportedMessage(knownInteface, message) {
    try {
        // Load OP
        let sc = message.beginParse();
        if (sc.remaining < 32) {
            return null;
        }
        let op = sc.readUintNumber(32);
        if (op === 0) {
            return null;
        }
        // Nominators parsing
        if (knownInteface === 'com.tonwhales.nominators:v0') {
            return parseNominatorsMessage(op, sc);
        }
    }
    catch (e) {
        console.warn(e);
    }
    return null;
}
parseSupportedMessage$1.parseSupportedMessage = parseSupportedMessage;

var CellMessage$1 = {};

Object.defineProperty(CellMessage$1, "__esModule", { value: true });
CellMessage$1.CellMessage = void 0;
class CellMessage {
    constructor(cell) {
        this.cell = cell;
    }
    writeTo(cell) {
        cell.writeCell(this.cell);
    }
}
CellMessage$1.CellMessage = CellMessage;

var InternalMessage$1 = {};

var bn = {exports: {}};

var require$$0$2 = /*@__PURE__*/getAugmentedNamespace(bufferEs6);

(function (module) {
	(function (module, exports) {

	  // Utils
	  function assert (val, msg) {
	    if (!val) throw new Error(msg || 'Assertion failed');
	  }

	  // Could use `inherits` module, but don't want to move from single file
	  // architecture yet.
	  function inherits (ctor, superCtor) {
	    ctor.super_ = superCtor;
	    var TempCtor = function () {};
	    TempCtor.prototype = superCtor.prototype;
	    ctor.prototype = new TempCtor();
	    ctor.prototype.constructor = ctor;
	  }

	  // BN

	  function BN (number, base, endian) {
	    if (BN.isBN(number)) {
	      return number;
	    }

	    this.negative = 0;
	    this.words = null;
	    this.length = 0;

	    // Reduction context
	    this.red = null;

	    if (number !== null) {
	      if (base === 'le' || base === 'be') {
	        endian = base;
	        base = 10;
	      }

	      this._init(number || 0, base || 10, endian || 'be');
	    }
	  }
	  if (typeof module === 'object') {
	    module.exports = BN;
	  } else {
	    exports.BN = BN;
	  }

	  BN.BN = BN;
	  BN.wordSize = 26;

	  var Buffer;
	  try {
	    if (typeof window !== 'undefined' && typeof window.Buffer !== 'undefined') {
	      Buffer = window.Buffer;
	    } else {
	      Buffer = require$$0$2.Buffer;
	    }
	  } catch (e) {
	  }

	  BN.isBN = function isBN (num) {
	    if (num instanceof BN) {
	      return true;
	    }

	    return num !== null && typeof num === 'object' &&
	      num.constructor.wordSize === BN.wordSize && Array.isArray(num.words);
	  };

	  BN.max = function max (left, right) {
	    if (left.cmp(right) > 0) return left;
	    return right;
	  };

	  BN.min = function min (left, right) {
	    if (left.cmp(right) < 0) return left;
	    return right;
	  };

	  BN.prototype._init = function init (number, base, endian) {
	    if (typeof number === 'number') {
	      return this._initNumber(number, base, endian);
	    }

	    if (typeof number === 'object') {
	      return this._initArray(number, base, endian);
	    }

	    if (base === 'hex') {
	      base = 16;
	    }
	    assert(base === (base | 0) && base >= 2 && base <= 36);

	    number = number.toString().replace(/\s+/g, '');
	    var start = 0;
	    if (number[0] === '-') {
	      start++;
	      this.negative = 1;
	    }

	    if (start < number.length) {
	      if (base === 16) {
	        this._parseHex(number, start, endian);
	      } else {
	        this._parseBase(number, base, start);
	        if (endian === 'le') {
	          this._initArray(this.toArray(), base, endian);
	        }
	      }
	    }
	  };

	  BN.prototype._initNumber = function _initNumber (number, base, endian) {
	    if (number < 0) {
	      this.negative = 1;
	      number = -number;
	    }
	    if (number < 0x4000000) {
	      this.words = [number & 0x3ffffff];
	      this.length = 1;
	    } else if (number < 0x10000000000000) {
	      this.words = [
	        number & 0x3ffffff,
	        (number / 0x4000000) & 0x3ffffff
	      ];
	      this.length = 2;
	    } else {
	      assert(number < 0x20000000000000); // 2 ^ 53 (unsafe)
	      this.words = [
	        number & 0x3ffffff,
	        (number / 0x4000000) & 0x3ffffff,
	        1
	      ];
	      this.length = 3;
	    }

	    if (endian !== 'le') return;

	    // Reverse the bytes
	    this._initArray(this.toArray(), base, endian);
	  };

	  BN.prototype._initArray = function _initArray (number, base, endian) {
	    // Perhaps a Uint8Array
	    assert(typeof number.length === 'number');
	    if (number.length <= 0) {
	      this.words = [0];
	      this.length = 1;
	      return this;
	    }

	    this.length = Math.ceil(number.length / 3);
	    this.words = new Array(this.length);
	    for (var i = 0; i < this.length; i++) {
	      this.words[i] = 0;
	    }

	    var j, w;
	    var off = 0;
	    if (endian === 'be') {
	      for (i = number.length - 1, j = 0; i >= 0; i -= 3) {
	        w = number[i] | (number[i - 1] << 8) | (number[i - 2] << 16);
	        this.words[j] |= (w << off) & 0x3ffffff;
	        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
	        off += 24;
	        if (off >= 26) {
	          off -= 26;
	          j++;
	        }
	      }
	    } else if (endian === 'le') {
	      for (i = 0, j = 0; i < number.length; i += 3) {
	        w = number[i] | (number[i + 1] << 8) | (number[i + 2] << 16);
	        this.words[j] |= (w << off) & 0x3ffffff;
	        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
	        off += 24;
	        if (off >= 26) {
	          off -= 26;
	          j++;
	        }
	      }
	    }
	    return this._strip();
	  };

	  function parseHex4Bits (string, index) {
	    var c = string.charCodeAt(index);
	    // '0' - '9'
	    if (c >= 48 && c <= 57) {
	      return c - 48;
	    // 'A' - 'F'
	    } else if (c >= 65 && c <= 70) {
	      return c - 55;
	    // 'a' - 'f'
	    } else if (c >= 97 && c <= 102) {
	      return c - 87;
	    } else {
	      assert(false, 'Invalid character in ' + string);
	    }
	  }

	  function parseHexByte (string, lowerBound, index) {
	    var r = parseHex4Bits(string, index);
	    if (index - 1 >= lowerBound) {
	      r |= parseHex4Bits(string, index - 1) << 4;
	    }
	    return r;
	  }

	  BN.prototype._parseHex = function _parseHex (number, start, endian) {
	    // Create possibly bigger array to ensure that it fits the number
	    this.length = Math.ceil((number.length - start) / 6);
	    this.words = new Array(this.length);
	    for (var i = 0; i < this.length; i++) {
	      this.words[i] = 0;
	    }

	    // 24-bits chunks
	    var off = 0;
	    var j = 0;

	    var w;
	    if (endian === 'be') {
	      for (i = number.length - 1; i >= start; i -= 2) {
	        w = parseHexByte(number, start, i) << off;
	        this.words[j] |= w & 0x3ffffff;
	        if (off >= 18) {
	          off -= 18;
	          j += 1;
	          this.words[j] |= w >>> 26;
	        } else {
	          off += 8;
	        }
	      }
	    } else {
	      var parseLength = number.length - start;
	      for (i = parseLength % 2 === 0 ? start + 1 : start; i < number.length; i += 2) {
	        w = parseHexByte(number, start, i) << off;
	        this.words[j] |= w & 0x3ffffff;
	        if (off >= 18) {
	          off -= 18;
	          j += 1;
	          this.words[j] |= w >>> 26;
	        } else {
	          off += 8;
	        }
	      }
	    }

	    this._strip();
	  };

	  function parseBase (str, start, end, mul) {
	    var r = 0;
	    var b = 0;
	    var len = Math.min(str.length, end);
	    for (var i = start; i < len; i++) {
	      var c = str.charCodeAt(i) - 48;

	      r *= mul;

	      // 'a'
	      if (c >= 49) {
	        b = c - 49 + 0xa;

	      // 'A'
	      } else if (c >= 17) {
	        b = c - 17 + 0xa;

	      // '0' - '9'
	      } else {
	        b = c;
	      }
	      assert(c >= 0 && b < mul, 'Invalid character');
	      r += b;
	    }
	    return r;
	  }

	  BN.prototype._parseBase = function _parseBase (number, base, start) {
	    // Initialize as zero
	    this.words = [0];
	    this.length = 1;

	    // Find length of limb in base
	    for (var limbLen = 0, limbPow = 1; limbPow <= 0x3ffffff; limbPow *= base) {
	      limbLen++;
	    }
	    limbLen--;
	    limbPow = (limbPow / base) | 0;

	    var total = number.length - start;
	    var mod = total % limbLen;
	    var end = Math.min(total, total - mod) + start;

	    var word = 0;
	    for (var i = start; i < end; i += limbLen) {
	      word = parseBase(number, i, i + limbLen, base);

	      this.imuln(limbPow);
	      if (this.words[0] + word < 0x4000000) {
	        this.words[0] += word;
	      } else {
	        this._iaddn(word);
	      }
	    }

	    if (mod !== 0) {
	      var pow = 1;
	      word = parseBase(number, i, number.length, base);

	      for (i = 0; i < mod; i++) {
	        pow *= base;
	      }

	      this.imuln(pow);
	      if (this.words[0] + word < 0x4000000) {
	        this.words[0] += word;
	      } else {
	        this._iaddn(word);
	      }
	    }

	    this._strip();
	  };

	  BN.prototype.copy = function copy (dest) {
	    dest.words = new Array(this.length);
	    for (var i = 0; i < this.length; i++) {
	      dest.words[i] = this.words[i];
	    }
	    dest.length = this.length;
	    dest.negative = this.negative;
	    dest.red = this.red;
	  };

	  function move (dest, src) {
	    dest.words = src.words;
	    dest.length = src.length;
	    dest.negative = src.negative;
	    dest.red = src.red;
	  }

	  BN.prototype._move = function _move (dest) {
	    move(dest, this);
	  };

	  BN.prototype.clone = function clone () {
	    var r = new BN(null);
	    this.copy(r);
	    return r;
	  };

	  BN.prototype._expand = function _expand (size) {
	    while (this.length < size) {
	      this.words[this.length++] = 0;
	    }
	    return this;
	  };

	  // Remove leading `0` from `this`
	  BN.prototype._strip = function strip () {
	    while (this.length > 1 && this.words[this.length - 1] === 0) {
	      this.length--;
	    }
	    return this._normSign();
	  };

	  BN.prototype._normSign = function _normSign () {
	    // -0 = 0
	    if (this.length === 1 && this.words[0] === 0) {
	      this.negative = 0;
	    }
	    return this;
	  };

	  // Check Symbol.for because not everywhere where Symbol defined
	  // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Browser_compatibility
	  if (typeof Symbol !== 'undefined' && typeof Symbol.for === 'function') {
	    try {
	      BN.prototype[Symbol.for('nodejs.util.inspect.custom')] = inspect;
	    } catch (e) {
	      BN.prototype.inspect = inspect;
	    }
	  } else {
	    BN.prototype.inspect = inspect;
	  }

	  function inspect () {
	    return (this.red ? '<BN-R: ' : '<BN: ') + this.toString(16) + '>';
	  }

	  /*

	  var zeros = [];
	  var groupSizes = [];
	  var groupBases = [];

	  var s = '';
	  var i = -1;
	  while (++i < BN.wordSize) {
	    zeros[i] = s;
	    s += '0';
	  }
	  groupSizes[0] = 0;
	  groupSizes[1] = 0;
	  groupBases[0] = 0;
	  groupBases[1] = 0;
	  var base = 2 - 1;
	  while (++base < 36 + 1) {
	    var groupSize = 0;
	    var groupBase = 1;
	    while (groupBase < (1 << BN.wordSize) / base) {
	      groupBase *= base;
	      groupSize += 1;
	    }
	    groupSizes[base] = groupSize;
	    groupBases[base] = groupBase;
	  }

	  */

	  var zeros = [
	    '',
	    '0',
	    '00',
	    '000',
	    '0000',
	    '00000',
	    '000000',
	    '0000000',
	    '00000000',
	    '000000000',
	    '0000000000',
	    '00000000000',
	    '000000000000',
	    '0000000000000',
	    '00000000000000',
	    '000000000000000',
	    '0000000000000000',
	    '00000000000000000',
	    '000000000000000000',
	    '0000000000000000000',
	    '00000000000000000000',
	    '000000000000000000000',
	    '0000000000000000000000',
	    '00000000000000000000000',
	    '000000000000000000000000',
	    '0000000000000000000000000'
	  ];

	  var groupSizes = [
	    0, 0,
	    25, 16, 12, 11, 10, 9, 8,
	    8, 7, 7, 7, 7, 6, 6,
	    6, 6, 6, 6, 6, 5, 5,
	    5, 5, 5, 5, 5, 5, 5,
	    5, 5, 5, 5, 5, 5, 5
	  ];

	  var groupBases = [
	    0, 0,
	    33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216,
	    43046721, 10000000, 19487171, 35831808, 62748517, 7529536, 11390625,
	    16777216, 24137569, 34012224, 47045881, 64000000, 4084101, 5153632,
	    6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149,
	    24300000, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176
	  ];

	  BN.prototype.toString = function toString (base, padding) {
	    base = base || 10;
	    padding = padding | 0 || 1;

	    var out;
	    if (base === 16 || base === 'hex') {
	      out = '';
	      var off = 0;
	      var carry = 0;
	      for (var i = 0; i < this.length; i++) {
	        var w = this.words[i];
	        var word = (((w << off) | carry) & 0xffffff).toString(16);
	        carry = (w >>> (24 - off)) & 0xffffff;
	        if (carry !== 0 || i !== this.length - 1) {
	          out = zeros[6 - word.length] + word + out;
	        } else {
	          out = word + out;
	        }
	        off += 2;
	        if (off >= 26) {
	          off -= 26;
	          i--;
	        }
	      }
	      if (carry !== 0) {
	        out = carry.toString(16) + out;
	      }
	      while (out.length % padding !== 0) {
	        out = '0' + out;
	      }
	      if (this.negative !== 0) {
	        out = '-' + out;
	      }
	      return out;
	    }

	    if (base === (base | 0) && base >= 2 && base <= 36) {
	      // var groupSize = Math.floor(BN.wordSize * Math.LN2 / Math.log(base));
	      var groupSize = groupSizes[base];
	      // var groupBase = Math.pow(base, groupSize);
	      var groupBase = groupBases[base];
	      out = '';
	      var c = this.clone();
	      c.negative = 0;
	      while (!c.isZero()) {
	        var r = c.modrn(groupBase).toString(base);
	        c = c.idivn(groupBase);

	        if (!c.isZero()) {
	          out = zeros[groupSize - r.length] + r + out;
	        } else {
	          out = r + out;
	        }
	      }
	      if (this.isZero()) {
	        out = '0' + out;
	      }
	      while (out.length % padding !== 0) {
	        out = '0' + out;
	      }
	      if (this.negative !== 0) {
	        out = '-' + out;
	      }
	      return out;
	    }

	    assert(false, 'Base should be between 2 and 36');
	  };

	  BN.prototype.toNumber = function toNumber () {
	    var ret = this.words[0];
	    if (this.length === 2) {
	      ret += this.words[1] * 0x4000000;
	    } else if (this.length === 3 && this.words[2] === 0x01) {
	      // NOTE: at this stage it is known that the top bit is set
	      ret += 0x10000000000000 + (this.words[1] * 0x4000000);
	    } else if (this.length > 2) {
	      assert(false, 'Number can only safely store up to 53 bits');
	    }
	    return (this.negative !== 0) ? -ret : ret;
	  };

	  BN.prototype.toJSON = function toJSON () {
	    return this.toString(16, 2);
	  };

	  if (Buffer) {
	    BN.prototype.toBuffer = function toBuffer (endian, length) {
	      return this.toArrayLike(Buffer, endian, length);
	    };
	  }

	  BN.prototype.toArray = function toArray (endian, length) {
	    return this.toArrayLike(Array, endian, length);
	  };

	  var allocate = function allocate (ArrayType, size) {
	    if (ArrayType.allocUnsafe) {
	      return ArrayType.allocUnsafe(size);
	    }
	    return new ArrayType(size);
	  };

	  BN.prototype.toArrayLike = function toArrayLike (ArrayType, endian, length) {
	    this._strip();

	    var byteLength = this.byteLength();
	    var reqLength = length || Math.max(1, byteLength);
	    assert(byteLength <= reqLength, 'byte array longer than desired length');
	    assert(reqLength > 0, 'Requested array length <= 0');

	    var res = allocate(ArrayType, reqLength);
	    var postfix = endian === 'le' ? 'LE' : 'BE';
	    this['_toArrayLike' + postfix](res, byteLength);
	    return res;
	  };

	  BN.prototype._toArrayLikeLE = function _toArrayLikeLE (res, byteLength) {
	    var position = 0;
	    var carry = 0;

	    for (var i = 0, shift = 0; i < this.length; i++) {
	      var word = (this.words[i] << shift) | carry;

	      res[position++] = word & 0xff;
	      if (position < res.length) {
	        res[position++] = (word >> 8) & 0xff;
	      }
	      if (position < res.length) {
	        res[position++] = (word >> 16) & 0xff;
	      }

	      if (shift === 6) {
	        if (position < res.length) {
	          res[position++] = (word >> 24) & 0xff;
	        }
	        carry = 0;
	        shift = 0;
	      } else {
	        carry = word >>> 24;
	        shift += 2;
	      }
	    }

	    if (position < res.length) {
	      res[position++] = carry;

	      while (position < res.length) {
	        res[position++] = 0;
	      }
	    }
	  };

	  BN.prototype._toArrayLikeBE = function _toArrayLikeBE (res, byteLength) {
	    var position = res.length - 1;
	    var carry = 0;

	    for (var i = 0, shift = 0; i < this.length; i++) {
	      var word = (this.words[i] << shift) | carry;

	      res[position--] = word & 0xff;
	      if (position >= 0) {
	        res[position--] = (word >> 8) & 0xff;
	      }
	      if (position >= 0) {
	        res[position--] = (word >> 16) & 0xff;
	      }

	      if (shift === 6) {
	        if (position >= 0) {
	          res[position--] = (word >> 24) & 0xff;
	        }
	        carry = 0;
	        shift = 0;
	      } else {
	        carry = word >>> 24;
	        shift += 2;
	      }
	    }

	    if (position >= 0) {
	      res[position--] = carry;

	      while (position >= 0) {
	        res[position--] = 0;
	      }
	    }
	  };

	  if (Math.clz32) {
	    BN.prototype._countBits = function _countBits (w) {
	      return 32 - Math.clz32(w);
	    };
	  } else {
	    BN.prototype._countBits = function _countBits (w) {
	      var t = w;
	      var r = 0;
	      if (t >= 0x1000) {
	        r += 13;
	        t >>>= 13;
	      }
	      if (t >= 0x40) {
	        r += 7;
	        t >>>= 7;
	      }
	      if (t >= 0x8) {
	        r += 4;
	        t >>>= 4;
	      }
	      if (t >= 0x02) {
	        r += 2;
	        t >>>= 2;
	      }
	      return r + t;
	    };
	  }

	  BN.prototype._zeroBits = function _zeroBits (w) {
	    // Short-cut
	    if (w === 0) return 26;

	    var t = w;
	    var r = 0;
	    if ((t & 0x1fff) === 0) {
	      r += 13;
	      t >>>= 13;
	    }
	    if ((t & 0x7f) === 0) {
	      r += 7;
	      t >>>= 7;
	    }
	    if ((t & 0xf) === 0) {
	      r += 4;
	      t >>>= 4;
	    }
	    if ((t & 0x3) === 0) {
	      r += 2;
	      t >>>= 2;
	    }
	    if ((t & 0x1) === 0) {
	      r++;
	    }
	    return r;
	  };

	  // Return number of used bits in a BN
	  BN.prototype.bitLength = function bitLength () {
	    var w = this.words[this.length - 1];
	    var hi = this._countBits(w);
	    return (this.length - 1) * 26 + hi;
	  };

	  function toBitArray (num) {
	    var w = new Array(num.bitLength());

	    for (var bit = 0; bit < w.length; bit++) {
	      var off = (bit / 26) | 0;
	      var wbit = bit % 26;

	      w[bit] = (num.words[off] >>> wbit) & 0x01;
	    }

	    return w;
	  }

	  // Number of trailing zero bits
	  BN.prototype.zeroBits = function zeroBits () {
	    if (this.isZero()) return 0;

	    var r = 0;
	    for (var i = 0; i < this.length; i++) {
	      var b = this._zeroBits(this.words[i]);
	      r += b;
	      if (b !== 26) break;
	    }
	    return r;
	  };

	  BN.prototype.byteLength = function byteLength () {
	    return Math.ceil(this.bitLength() / 8);
	  };

	  BN.prototype.toTwos = function toTwos (width) {
	    if (this.negative !== 0) {
	      return this.abs().inotn(width).iaddn(1);
	    }
	    return this.clone();
	  };

	  BN.prototype.fromTwos = function fromTwos (width) {
	    if (this.testn(width - 1)) {
	      return this.notn(width).iaddn(1).ineg();
	    }
	    return this.clone();
	  };

	  BN.prototype.isNeg = function isNeg () {
	    return this.negative !== 0;
	  };

	  // Return negative clone of `this`
	  BN.prototype.neg = function neg () {
	    return this.clone().ineg();
	  };

	  BN.prototype.ineg = function ineg () {
	    if (!this.isZero()) {
	      this.negative ^= 1;
	    }

	    return this;
	  };

	  // Or `num` with `this` in-place
	  BN.prototype.iuor = function iuor (num) {
	    while (this.length < num.length) {
	      this.words[this.length++] = 0;
	    }

	    for (var i = 0; i < num.length; i++) {
	      this.words[i] = this.words[i] | num.words[i];
	    }

	    return this._strip();
	  };

	  BN.prototype.ior = function ior (num) {
	    assert((this.negative | num.negative) === 0);
	    return this.iuor(num);
	  };

	  // Or `num` with `this`
	  BN.prototype.or = function or (num) {
	    if (this.length > num.length) return this.clone().ior(num);
	    return num.clone().ior(this);
	  };

	  BN.prototype.uor = function uor (num) {
	    if (this.length > num.length) return this.clone().iuor(num);
	    return num.clone().iuor(this);
	  };

	  // And `num` with `this` in-place
	  BN.prototype.iuand = function iuand (num) {
	    // b = min-length(num, this)
	    var b;
	    if (this.length > num.length) {
	      b = num;
	    } else {
	      b = this;
	    }

	    for (var i = 0; i < b.length; i++) {
	      this.words[i] = this.words[i] & num.words[i];
	    }

	    this.length = b.length;

	    return this._strip();
	  };

	  BN.prototype.iand = function iand (num) {
	    assert((this.negative | num.negative) === 0);
	    return this.iuand(num);
	  };

	  // And `num` with `this`
	  BN.prototype.and = function and (num) {
	    if (this.length > num.length) return this.clone().iand(num);
	    return num.clone().iand(this);
	  };

	  BN.prototype.uand = function uand (num) {
	    if (this.length > num.length) return this.clone().iuand(num);
	    return num.clone().iuand(this);
	  };

	  // Xor `num` with `this` in-place
	  BN.prototype.iuxor = function iuxor (num) {
	    // a.length > b.length
	    var a;
	    var b;
	    if (this.length > num.length) {
	      a = this;
	      b = num;
	    } else {
	      a = num;
	      b = this;
	    }

	    for (var i = 0; i < b.length; i++) {
	      this.words[i] = a.words[i] ^ b.words[i];
	    }

	    if (this !== a) {
	      for (; i < a.length; i++) {
	        this.words[i] = a.words[i];
	      }
	    }

	    this.length = a.length;

	    return this._strip();
	  };

	  BN.prototype.ixor = function ixor (num) {
	    assert((this.negative | num.negative) === 0);
	    return this.iuxor(num);
	  };

	  // Xor `num` with `this`
	  BN.prototype.xor = function xor (num) {
	    if (this.length > num.length) return this.clone().ixor(num);
	    return num.clone().ixor(this);
	  };

	  BN.prototype.uxor = function uxor (num) {
	    if (this.length > num.length) return this.clone().iuxor(num);
	    return num.clone().iuxor(this);
	  };

	  // Not ``this`` with ``width`` bitwidth
	  BN.prototype.inotn = function inotn (width) {
	    assert(typeof width === 'number' && width >= 0);

	    var bytesNeeded = Math.ceil(width / 26) | 0;
	    var bitsLeft = width % 26;

	    // Extend the buffer with leading zeroes
	    this._expand(bytesNeeded);

	    if (bitsLeft > 0) {
	      bytesNeeded--;
	    }

	    // Handle complete words
	    for (var i = 0; i < bytesNeeded; i++) {
	      this.words[i] = ~this.words[i] & 0x3ffffff;
	    }

	    // Handle the residue
	    if (bitsLeft > 0) {
	      this.words[i] = ~this.words[i] & (0x3ffffff >> (26 - bitsLeft));
	    }

	    // And remove leading zeroes
	    return this._strip();
	  };

	  BN.prototype.notn = function notn (width) {
	    return this.clone().inotn(width);
	  };

	  // Set `bit` of `this`
	  BN.prototype.setn = function setn (bit, val) {
	    assert(typeof bit === 'number' && bit >= 0);

	    var off = (bit / 26) | 0;
	    var wbit = bit % 26;

	    this._expand(off + 1);

	    if (val) {
	      this.words[off] = this.words[off] | (1 << wbit);
	    } else {
	      this.words[off] = this.words[off] & ~(1 << wbit);
	    }

	    return this._strip();
	  };

	  // Add `num` to `this` in-place
	  BN.prototype.iadd = function iadd (num) {
	    var r;

	    // negative + positive
	    if (this.negative !== 0 && num.negative === 0) {
	      this.negative = 0;
	      r = this.isub(num);
	      this.negative ^= 1;
	      return this._normSign();

	    // positive + negative
	    } else if (this.negative === 0 && num.negative !== 0) {
	      num.negative = 0;
	      r = this.isub(num);
	      num.negative = 1;
	      return r._normSign();
	    }

	    // a.length > b.length
	    var a, b;
	    if (this.length > num.length) {
	      a = this;
	      b = num;
	    } else {
	      a = num;
	      b = this;
	    }

	    var carry = 0;
	    for (var i = 0; i < b.length; i++) {
	      r = (a.words[i] | 0) + (b.words[i] | 0) + carry;
	      this.words[i] = r & 0x3ffffff;
	      carry = r >>> 26;
	    }
	    for (; carry !== 0 && i < a.length; i++) {
	      r = (a.words[i] | 0) + carry;
	      this.words[i] = r & 0x3ffffff;
	      carry = r >>> 26;
	    }

	    this.length = a.length;
	    if (carry !== 0) {
	      this.words[this.length] = carry;
	      this.length++;
	    // Copy the rest of the words
	    } else if (a !== this) {
	      for (; i < a.length; i++) {
	        this.words[i] = a.words[i];
	      }
	    }

	    return this;
	  };

	  // Add `num` to `this`
	  BN.prototype.add = function add (num) {
	    var res;
	    if (num.negative !== 0 && this.negative === 0) {
	      num.negative = 0;
	      res = this.sub(num);
	      num.negative ^= 1;
	      return res;
	    } else if (num.negative === 0 && this.negative !== 0) {
	      this.negative = 0;
	      res = num.sub(this);
	      this.negative = 1;
	      return res;
	    }

	    if (this.length > num.length) return this.clone().iadd(num);

	    return num.clone().iadd(this);
	  };

	  // Subtract `num` from `this` in-place
	  BN.prototype.isub = function isub (num) {
	    // this - (-num) = this + num
	    if (num.negative !== 0) {
	      num.negative = 0;
	      var r = this.iadd(num);
	      num.negative = 1;
	      return r._normSign();

	    // -this - num = -(this + num)
	    } else if (this.negative !== 0) {
	      this.negative = 0;
	      this.iadd(num);
	      this.negative = 1;
	      return this._normSign();
	    }

	    // At this point both numbers are positive
	    var cmp = this.cmp(num);

	    // Optimization - zeroify
	    if (cmp === 0) {
	      this.negative = 0;
	      this.length = 1;
	      this.words[0] = 0;
	      return this;
	    }

	    // a > b
	    var a, b;
	    if (cmp > 0) {
	      a = this;
	      b = num;
	    } else {
	      a = num;
	      b = this;
	    }

	    var carry = 0;
	    for (var i = 0; i < b.length; i++) {
	      r = (a.words[i] | 0) - (b.words[i] | 0) + carry;
	      carry = r >> 26;
	      this.words[i] = r & 0x3ffffff;
	    }
	    for (; carry !== 0 && i < a.length; i++) {
	      r = (a.words[i] | 0) + carry;
	      carry = r >> 26;
	      this.words[i] = r & 0x3ffffff;
	    }

	    // Copy rest of the words
	    if (carry === 0 && i < a.length && a !== this) {
	      for (; i < a.length; i++) {
	        this.words[i] = a.words[i];
	      }
	    }

	    this.length = Math.max(this.length, i);

	    if (a !== this) {
	      this.negative = 1;
	    }

	    return this._strip();
	  };

	  // Subtract `num` from `this`
	  BN.prototype.sub = function sub (num) {
	    return this.clone().isub(num);
	  };

	  function smallMulTo (self, num, out) {
	    out.negative = num.negative ^ self.negative;
	    var len = (self.length + num.length) | 0;
	    out.length = len;
	    len = (len - 1) | 0;

	    // Peel one iteration (compiler can't do it, because of code complexity)
	    var a = self.words[0] | 0;
	    var b = num.words[0] | 0;
	    var r = a * b;

	    var lo = r & 0x3ffffff;
	    var carry = (r / 0x4000000) | 0;
	    out.words[0] = lo;

	    for (var k = 1; k < len; k++) {
	      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
	      // note that ncarry could be >= 0x3ffffff
	      var ncarry = carry >>> 26;
	      var rword = carry & 0x3ffffff;
	      var maxJ = Math.min(k, num.length - 1);
	      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
	        var i = (k - j) | 0;
	        a = self.words[i] | 0;
	        b = num.words[j] | 0;
	        r = a * b + rword;
	        ncarry += (r / 0x4000000) | 0;
	        rword = r & 0x3ffffff;
	      }
	      out.words[k] = rword | 0;
	      carry = ncarry | 0;
	    }
	    if (carry !== 0) {
	      out.words[k] = carry | 0;
	    } else {
	      out.length--;
	    }

	    return out._strip();
	  }

	  // TODO(indutny): it may be reasonable to omit it for users who don't need
	  // to work with 256-bit numbers, otherwise it gives 20% improvement for 256-bit
	  // multiplication (like elliptic secp256k1).
	  var comb10MulTo = function comb10MulTo (self, num, out) {
	    var a = self.words;
	    var b = num.words;
	    var o = out.words;
	    var c = 0;
	    var lo;
	    var mid;
	    var hi;
	    var a0 = a[0] | 0;
	    var al0 = a0 & 0x1fff;
	    var ah0 = a0 >>> 13;
	    var a1 = a[1] | 0;
	    var al1 = a1 & 0x1fff;
	    var ah1 = a1 >>> 13;
	    var a2 = a[2] | 0;
	    var al2 = a2 & 0x1fff;
	    var ah2 = a2 >>> 13;
	    var a3 = a[3] | 0;
	    var al3 = a3 & 0x1fff;
	    var ah3 = a3 >>> 13;
	    var a4 = a[4] | 0;
	    var al4 = a4 & 0x1fff;
	    var ah4 = a4 >>> 13;
	    var a5 = a[5] | 0;
	    var al5 = a5 & 0x1fff;
	    var ah5 = a5 >>> 13;
	    var a6 = a[6] | 0;
	    var al6 = a6 & 0x1fff;
	    var ah6 = a6 >>> 13;
	    var a7 = a[7] | 0;
	    var al7 = a7 & 0x1fff;
	    var ah7 = a7 >>> 13;
	    var a8 = a[8] | 0;
	    var al8 = a8 & 0x1fff;
	    var ah8 = a8 >>> 13;
	    var a9 = a[9] | 0;
	    var al9 = a9 & 0x1fff;
	    var ah9 = a9 >>> 13;
	    var b0 = b[0] | 0;
	    var bl0 = b0 & 0x1fff;
	    var bh0 = b0 >>> 13;
	    var b1 = b[1] | 0;
	    var bl1 = b1 & 0x1fff;
	    var bh1 = b1 >>> 13;
	    var b2 = b[2] | 0;
	    var bl2 = b2 & 0x1fff;
	    var bh2 = b2 >>> 13;
	    var b3 = b[3] | 0;
	    var bl3 = b3 & 0x1fff;
	    var bh3 = b3 >>> 13;
	    var b4 = b[4] | 0;
	    var bl4 = b4 & 0x1fff;
	    var bh4 = b4 >>> 13;
	    var b5 = b[5] | 0;
	    var bl5 = b5 & 0x1fff;
	    var bh5 = b5 >>> 13;
	    var b6 = b[6] | 0;
	    var bl6 = b6 & 0x1fff;
	    var bh6 = b6 >>> 13;
	    var b7 = b[7] | 0;
	    var bl7 = b7 & 0x1fff;
	    var bh7 = b7 >>> 13;
	    var b8 = b[8] | 0;
	    var bl8 = b8 & 0x1fff;
	    var bh8 = b8 >>> 13;
	    var b9 = b[9] | 0;
	    var bl9 = b9 & 0x1fff;
	    var bh9 = b9 >>> 13;

	    out.negative = self.negative ^ num.negative;
	    out.length = 19;
	    /* k = 0 */
	    lo = Math.imul(al0, bl0);
	    mid = Math.imul(al0, bh0);
	    mid = (mid + Math.imul(ah0, bl0)) | 0;
	    hi = Math.imul(ah0, bh0);
	    var w0 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w0 >>> 26)) | 0;
	    w0 &= 0x3ffffff;
	    /* k = 1 */
	    lo = Math.imul(al1, bl0);
	    mid = Math.imul(al1, bh0);
	    mid = (mid + Math.imul(ah1, bl0)) | 0;
	    hi = Math.imul(ah1, bh0);
	    lo = (lo + Math.imul(al0, bl1)) | 0;
	    mid = (mid + Math.imul(al0, bh1)) | 0;
	    mid = (mid + Math.imul(ah0, bl1)) | 0;
	    hi = (hi + Math.imul(ah0, bh1)) | 0;
	    var w1 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w1 >>> 26)) | 0;
	    w1 &= 0x3ffffff;
	    /* k = 2 */
	    lo = Math.imul(al2, bl0);
	    mid = Math.imul(al2, bh0);
	    mid = (mid + Math.imul(ah2, bl0)) | 0;
	    hi = Math.imul(ah2, bh0);
	    lo = (lo + Math.imul(al1, bl1)) | 0;
	    mid = (mid + Math.imul(al1, bh1)) | 0;
	    mid = (mid + Math.imul(ah1, bl1)) | 0;
	    hi = (hi + Math.imul(ah1, bh1)) | 0;
	    lo = (lo + Math.imul(al0, bl2)) | 0;
	    mid = (mid + Math.imul(al0, bh2)) | 0;
	    mid = (mid + Math.imul(ah0, bl2)) | 0;
	    hi = (hi + Math.imul(ah0, bh2)) | 0;
	    var w2 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w2 >>> 26)) | 0;
	    w2 &= 0x3ffffff;
	    /* k = 3 */
	    lo = Math.imul(al3, bl0);
	    mid = Math.imul(al3, bh0);
	    mid = (mid + Math.imul(ah3, bl0)) | 0;
	    hi = Math.imul(ah3, bh0);
	    lo = (lo + Math.imul(al2, bl1)) | 0;
	    mid = (mid + Math.imul(al2, bh1)) | 0;
	    mid = (mid + Math.imul(ah2, bl1)) | 0;
	    hi = (hi + Math.imul(ah2, bh1)) | 0;
	    lo = (lo + Math.imul(al1, bl2)) | 0;
	    mid = (mid + Math.imul(al1, bh2)) | 0;
	    mid = (mid + Math.imul(ah1, bl2)) | 0;
	    hi = (hi + Math.imul(ah1, bh2)) | 0;
	    lo = (lo + Math.imul(al0, bl3)) | 0;
	    mid = (mid + Math.imul(al0, bh3)) | 0;
	    mid = (mid + Math.imul(ah0, bl3)) | 0;
	    hi = (hi + Math.imul(ah0, bh3)) | 0;
	    var w3 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w3 >>> 26)) | 0;
	    w3 &= 0x3ffffff;
	    /* k = 4 */
	    lo = Math.imul(al4, bl0);
	    mid = Math.imul(al4, bh0);
	    mid = (mid + Math.imul(ah4, bl0)) | 0;
	    hi = Math.imul(ah4, bh0);
	    lo = (lo + Math.imul(al3, bl1)) | 0;
	    mid = (mid + Math.imul(al3, bh1)) | 0;
	    mid = (mid + Math.imul(ah3, bl1)) | 0;
	    hi = (hi + Math.imul(ah3, bh1)) | 0;
	    lo = (lo + Math.imul(al2, bl2)) | 0;
	    mid = (mid + Math.imul(al2, bh2)) | 0;
	    mid = (mid + Math.imul(ah2, bl2)) | 0;
	    hi = (hi + Math.imul(ah2, bh2)) | 0;
	    lo = (lo + Math.imul(al1, bl3)) | 0;
	    mid = (mid + Math.imul(al1, bh3)) | 0;
	    mid = (mid + Math.imul(ah1, bl3)) | 0;
	    hi = (hi + Math.imul(ah1, bh3)) | 0;
	    lo = (lo + Math.imul(al0, bl4)) | 0;
	    mid = (mid + Math.imul(al0, bh4)) | 0;
	    mid = (mid + Math.imul(ah0, bl4)) | 0;
	    hi = (hi + Math.imul(ah0, bh4)) | 0;
	    var w4 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w4 >>> 26)) | 0;
	    w4 &= 0x3ffffff;
	    /* k = 5 */
	    lo = Math.imul(al5, bl0);
	    mid = Math.imul(al5, bh0);
	    mid = (mid + Math.imul(ah5, bl0)) | 0;
	    hi = Math.imul(ah5, bh0);
	    lo = (lo + Math.imul(al4, bl1)) | 0;
	    mid = (mid + Math.imul(al4, bh1)) | 0;
	    mid = (mid + Math.imul(ah4, bl1)) | 0;
	    hi = (hi + Math.imul(ah4, bh1)) | 0;
	    lo = (lo + Math.imul(al3, bl2)) | 0;
	    mid = (mid + Math.imul(al3, bh2)) | 0;
	    mid = (mid + Math.imul(ah3, bl2)) | 0;
	    hi = (hi + Math.imul(ah3, bh2)) | 0;
	    lo = (lo + Math.imul(al2, bl3)) | 0;
	    mid = (mid + Math.imul(al2, bh3)) | 0;
	    mid = (mid + Math.imul(ah2, bl3)) | 0;
	    hi = (hi + Math.imul(ah2, bh3)) | 0;
	    lo = (lo + Math.imul(al1, bl4)) | 0;
	    mid = (mid + Math.imul(al1, bh4)) | 0;
	    mid = (mid + Math.imul(ah1, bl4)) | 0;
	    hi = (hi + Math.imul(ah1, bh4)) | 0;
	    lo = (lo + Math.imul(al0, bl5)) | 0;
	    mid = (mid + Math.imul(al0, bh5)) | 0;
	    mid = (mid + Math.imul(ah0, bl5)) | 0;
	    hi = (hi + Math.imul(ah0, bh5)) | 0;
	    var w5 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w5 >>> 26)) | 0;
	    w5 &= 0x3ffffff;
	    /* k = 6 */
	    lo = Math.imul(al6, bl0);
	    mid = Math.imul(al6, bh0);
	    mid = (mid + Math.imul(ah6, bl0)) | 0;
	    hi = Math.imul(ah6, bh0);
	    lo = (lo + Math.imul(al5, bl1)) | 0;
	    mid = (mid + Math.imul(al5, bh1)) | 0;
	    mid = (mid + Math.imul(ah5, bl1)) | 0;
	    hi = (hi + Math.imul(ah5, bh1)) | 0;
	    lo = (lo + Math.imul(al4, bl2)) | 0;
	    mid = (mid + Math.imul(al4, bh2)) | 0;
	    mid = (mid + Math.imul(ah4, bl2)) | 0;
	    hi = (hi + Math.imul(ah4, bh2)) | 0;
	    lo = (lo + Math.imul(al3, bl3)) | 0;
	    mid = (mid + Math.imul(al3, bh3)) | 0;
	    mid = (mid + Math.imul(ah3, bl3)) | 0;
	    hi = (hi + Math.imul(ah3, bh3)) | 0;
	    lo = (lo + Math.imul(al2, bl4)) | 0;
	    mid = (mid + Math.imul(al2, bh4)) | 0;
	    mid = (mid + Math.imul(ah2, bl4)) | 0;
	    hi = (hi + Math.imul(ah2, bh4)) | 0;
	    lo = (lo + Math.imul(al1, bl5)) | 0;
	    mid = (mid + Math.imul(al1, bh5)) | 0;
	    mid = (mid + Math.imul(ah1, bl5)) | 0;
	    hi = (hi + Math.imul(ah1, bh5)) | 0;
	    lo = (lo + Math.imul(al0, bl6)) | 0;
	    mid = (mid + Math.imul(al0, bh6)) | 0;
	    mid = (mid + Math.imul(ah0, bl6)) | 0;
	    hi = (hi + Math.imul(ah0, bh6)) | 0;
	    var w6 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w6 >>> 26)) | 0;
	    w6 &= 0x3ffffff;
	    /* k = 7 */
	    lo = Math.imul(al7, bl0);
	    mid = Math.imul(al7, bh0);
	    mid = (mid + Math.imul(ah7, bl0)) | 0;
	    hi = Math.imul(ah7, bh0);
	    lo = (lo + Math.imul(al6, bl1)) | 0;
	    mid = (mid + Math.imul(al6, bh1)) | 0;
	    mid = (mid + Math.imul(ah6, bl1)) | 0;
	    hi = (hi + Math.imul(ah6, bh1)) | 0;
	    lo = (lo + Math.imul(al5, bl2)) | 0;
	    mid = (mid + Math.imul(al5, bh2)) | 0;
	    mid = (mid + Math.imul(ah5, bl2)) | 0;
	    hi = (hi + Math.imul(ah5, bh2)) | 0;
	    lo = (lo + Math.imul(al4, bl3)) | 0;
	    mid = (mid + Math.imul(al4, bh3)) | 0;
	    mid = (mid + Math.imul(ah4, bl3)) | 0;
	    hi = (hi + Math.imul(ah4, bh3)) | 0;
	    lo = (lo + Math.imul(al3, bl4)) | 0;
	    mid = (mid + Math.imul(al3, bh4)) | 0;
	    mid = (mid + Math.imul(ah3, bl4)) | 0;
	    hi = (hi + Math.imul(ah3, bh4)) | 0;
	    lo = (lo + Math.imul(al2, bl5)) | 0;
	    mid = (mid + Math.imul(al2, bh5)) | 0;
	    mid = (mid + Math.imul(ah2, bl5)) | 0;
	    hi = (hi + Math.imul(ah2, bh5)) | 0;
	    lo = (lo + Math.imul(al1, bl6)) | 0;
	    mid = (mid + Math.imul(al1, bh6)) | 0;
	    mid = (mid + Math.imul(ah1, bl6)) | 0;
	    hi = (hi + Math.imul(ah1, bh6)) | 0;
	    lo = (lo + Math.imul(al0, bl7)) | 0;
	    mid = (mid + Math.imul(al0, bh7)) | 0;
	    mid = (mid + Math.imul(ah0, bl7)) | 0;
	    hi = (hi + Math.imul(ah0, bh7)) | 0;
	    var w7 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w7 >>> 26)) | 0;
	    w7 &= 0x3ffffff;
	    /* k = 8 */
	    lo = Math.imul(al8, bl0);
	    mid = Math.imul(al8, bh0);
	    mid = (mid + Math.imul(ah8, bl0)) | 0;
	    hi = Math.imul(ah8, bh0);
	    lo = (lo + Math.imul(al7, bl1)) | 0;
	    mid = (mid + Math.imul(al7, bh1)) | 0;
	    mid = (mid + Math.imul(ah7, bl1)) | 0;
	    hi = (hi + Math.imul(ah7, bh1)) | 0;
	    lo = (lo + Math.imul(al6, bl2)) | 0;
	    mid = (mid + Math.imul(al6, bh2)) | 0;
	    mid = (mid + Math.imul(ah6, bl2)) | 0;
	    hi = (hi + Math.imul(ah6, bh2)) | 0;
	    lo = (lo + Math.imul(al5, bl3)) | 0;
	    mid = (mid + Math.imul(al5, bh3)) | 0;
	    mid = (mid + Math.imul(ah5, bl3)) | 0;
	    hi = (hi + Math.imul(ah5, bh3)) | 0;
	    lo = (lo + Math.imul(al4, bl4)) | 0;
	    mid = (mid + Math.imul(al4, bh4)) | 0;
	    mid = (mid + Math.imul(ah4, bl4)) | 0;
	    hi = (hi + Math.imul(ah4, bh4)) | 0;
	    lo = (lo + Math.imul(al3, bl5)) | 0;
	    mid = (mid + Math.imul(al3, bh5)) | 0;
	    mid = (mid + Math.imul(ah3, bl5)) | 0;
	    hi = (hi + Math.imul(ah3, bh5)) | 0;
	    lo = (lo + Math.imul(al2, bl6)) | 0;
	    mid = (mid + Math.imul(al2, bh6)) | 0;
	    mid = (mid + Math.imul(ah2, bl6)) | 0;
	    hi = (hi + Math.imul(ah2, bh6)) | 0;
	    lo = (lo + Math.imul(al1, bl7)) | 0;
	    mid = (mid + Math.imul(al1, bh7)) | 0;
	    mid = (mid + Math.imul(ah1, bl7)) | 0;
	    hi = (hi + Math.imul(ah1, bh7)) | 0;
	    lo = (lo + Math.imul(al0, bl8)) | 0;
	    mid = (mid + Math.imul(al0, bh8)) | 0;
	    mid = (mid + Math.imul(ah0, bl8)) | 0;
	    hi = (hi + Math.imul(ah0, bh8)) | 0;
	    var w8 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w8 >>> 26)) | 0;
	    w8 &= 0x3ffffff;
	    /* k = 9 */
	    lo = Math.imul(al9, bl0);
	    mid = Math.imul(al9, bh0);
	    mid = (mid + Math.imul(ah9, bl0)) | 0;
	    hi = Math.imul(ah9, bh0);
	    lo = (lo + Math.imul(al8, bl1)) | 0;
	    mid = (mid + Math.imul(al8, bh1)) | 0;
	    mid = (mid + Math.imul(ah8, bl1)) | 0;
	    hi = (hi + Math.imul(ah8, bh1)) | 0;
	    lo = (lo + Math.imul(al7, bl2)) | 0;
	    mid = (mid + Math.imul(al7, bh2)) | 0;
	    mid = (mid + Math.imul(ah7, bl2)) | 0;
	    hi = (hi + Math.imul(ah7, bh2)) | 0;
	    lo = (lo + Math.imul(al6, bl3)) | 0;
	    mid = (mid + Math.imul(al6, bh3)) | 0;
	    mid = (mid + Math.imul(ah6, bl3)) | 0;
	    hi = (hi + Math.imul(ah6, bh3)) | 0;
	    lo = (lo + Math.imul(al5, bl4)) | 0;
	    mid = (mid + Math.imul(al5, bh4)) | 0;
	    mid = (mid + Math.imul(ah5, bl4)) | 0;
	    hi = (hi + Math.imul(ah5, bh4)) | 0;
	    lo = (lo + Math.imul(al4, bl5)) | 0;
	    mid = (mid + Math.imul(al4, bh5)) | 0;
	    mid = (mid + Math.imul(ah4, bl5)) | 0;
	    hi = (hi + Math.imul(ah4, bh5)) | 0;
	    lo = (lo + Math.imul(al3, bl6)) | 0;
	    mid = (mid + Math.imul(al3, bh6)) | 0;
	    mid = (mid + Math.imul(ah3, bl6)) | 0;
	    hi = (hi + Math.imul(ah3, bh6)) | 0;
	    lo = (lo + Math.imul(al2, bl7)) | 0;
	    mid = (mid + Math.imul(al2, bh7)) | 0;
	    mid = (mid + Math.imul(ah2, bl7)) | 0;
	    hi = (hi + Math.imul(ah2, bh7)) | 0;
	    lo = (lo + Math.imul(al1, bl8)) | 0;
	    mid = (mid + Math.imul(al1, bh8)) | 0;
	    mid = (mid + Math.imul(ah1, bl8)) | 0;
	    hi = (hi + Math.imul(ah1, bh8)) | 0;
	    lo = (lo + Math.imul(al0, bl9)) | 0;
	    mid = (mid + Math.imul(al0, bh9)) | 0;
	    mid = (mid + Math.imul(ah0, bl9)) | 0;
	    hi = (hi + Math.imul(ah0, bh9)) | 0;
	    var w9 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w9 >>> 26)) | 0;
	    w9 &= 0x3ffffff;
	    /* k = 10 */
	    lo = Math.imul(al9, bl1);
	    mid = Math.imul(al9, bh1);
	    mid = (mid + Math.imul(ah9, bl1)) | 0;
	    hi = Math.imul(ah9, bh1);
	    lo = (lo + Math.imul(al8, bl2)) | 0;
	    mid = (mid + Math.imul(al8, bh2)) | 0;
	    mid = (mid + Math.imul(ah8, bl2)) | 0;
	    hi = (hi + Math.imul(ah8, bh2)) | 0;
	    lo = (lo + Math.imul(al7, bl3)) | 0;
	    mid = (mid + Math.imul(al7, bh3)) | 0;
	    mid = (mid + Math.imul(ah7, bl3)) | 0;
	    hi = (hi + Math.imul(ah7, bh3)) | 0;
	    lo = (lo + Math.imul(al6, bl4)) | 0;
	    mid = (mid + Math.imul(al6, bh4)) | 0;
	    mid = (mid + Math.imul(ah6, bl4)) | 0;
	    hi = (hi + Math.imul(ah6, bh4)) | 0;
	    lo = (lo + Math.imul(al5, bl5)) | 0;
	    mid = (mid + Math.imul(al5, bh5)) | 0;
	    mid = (mid + Math.imul(ah5, bl5)) | 0;
	    hi = (hi + Math.imul(ah5, bh5)) | 0;
	    lo = (lo + Math.imul(al4, bl6)) | 0;
	    mid = (mid + Math.imul(al4, bh6)) | 0;
	    mid = (mid + Math.imul(ah4, bl6)) | 0;
	    hi = (hi + Math.imul(ah4, bh6)) | 0;
	    lo = (lo + Math.imul(al3, bl7)) | 0;
	    mid = (mid + Math.imul(al3, bh7)) | 0;
	    mid = (mid + Math.imul(ah3, bl7)) | 0;
	    hi = (hi + Math.imul(ah3, bh7)) | 0;
	    lo = (lo + Math.imul(al2, bl8)) | 0;
	    mid = (mid + Math.imul(al2, bh8)) | 0;
	    mid = (mid + Math.imul(ah2, bl8)) | 0;
	    hi = (hi + Math.imul(ah2, bh8)) | 0;
	    lo = (lo + Math.imul(al1, bl9)) | 0;
	    mid = (mid + Math.imul(al1, bh9)) | 0;
	    mid = (mid + Math.imul(ah1, bl9)) | 0;
	    hi = (hi + Math.imul(ah1, bh9)) | 0;
	    var w10 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w10 >>> 26)) | 0;
	    w10 &= 0x3ffffff;
	    /* k = 11 */
	    lo = Math.imul(al9, bl2);
	    mid = Math.imul(al9, bh2);
	    mid = (mid + Math.imul(ah9, bl2)) | 0;
	    hi = Math.imul(ah9, bh2);
	    lo = (lo + Math.imul(al8, bl3)) | 0;
	    mid = (mid + Math.imul(al8, bh3)) | 0;
	    mid = (mid + Math.imul(ah8, bl3)) | 0;
	    hi = (hi + Math.imul(ah8, bh3)) | 0;
	    lo = (lo + Math.imul(al7, bl4)) | 0;
	    mid = (mid + Math.imul(al7, bh4)) | 0;
	    mid = (mid + Math.imul(ah7, bl4)) | 0;
	    hi = (hi + Math.imul(ah7, bh4)) | 0;
	    lo = (lo + Math.imul(al6, bl5)) | 0;
	    mid = (mid + Math.imul(al6, bh5)) | 0;
	    mid = (mid + Math.imul(ah6, bl5)) | 0;
	    hi = (hi + Math.imul(ah6, bh5)) | 0;
	    lo = (lo + Math.imul(al5, bl6)) | 0;
	    mid = (mid + Math.imul(al5, bh6)) | 0;
	    mid = (mid + Math.imul(ah5, bl6)) | 0;
	    hi = (hi + Math.imul(ah5, bh6)) | 0;
	    lo = (lo + Math.imul(al4, bl7)) | 0;
	    mid = (mid + Math.imul(al4, bh7)) | 0;
	    mid = (mid + Math.imul(ah4, bl7)) | 0;
	    hi = (hi + Math.imul(ah4, bh7)) | 0;
	    lo = (lo + Math.imul(al3, bl8)) | 0;
	    mid = (mid + Math.imul(al3, bh8)) | 0;
	    mid = (mid + Math.imul(ah3, bl8)) | 0;
	    hi = (hi + Math.imul(ah3, bh8)) | 0;
	    lo = (lo + Math.imul(al2, bl9)) | 0;
	    mid = (mid + Math.imul(al2, bh9)) | 0;
	    mid = (mid + Math.imul(ah2, bl9)) | 0;
	    hi = (hi + Math.imul(ah2, bh9)) | 0;
	    var w11 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w11 >>> 26)) | 0;
	    w11 &= 0x3ffffff;
	    /* k = 12 */
	    lo = Math.imul(al9, bl3);
	    mid = Math.imul(al9, bh3);
	    mid = (mid + Math.imul(ah9, bl3)) | 0;
	    hi = Math.imul(ah9, bh3);
	    lo = (lo + Math.imul(al8, bl4)) | 0;
	    mid = (mid + Math.imul(al8, bh4)) | 0;
	    mid = (mid + Math.imul(ah8, bl4)) | 0;
	    hi = (hi + Math.imul(ah8, bh4)) | 0;
	    lo = (lo + Math.imul(al7, bl5)) | 0;
	    mid = (mid + Math.imul(al7, bh5)) | 0;
	    mid = (mid + Math.imul(ah7, bl5)) | 0;
	    hi = (hi + Math.imul(ah7, bh5)) | 0;
	    lo = (lo + Math.imul(al6, bl6)) | 0;
	    mid = (mid + Math.imul(al6, bh6)) | 0;
	    mid = (mid + Math.imul(ah6, bl6)) | 0;
	    hi = (hi + Math.imul(ah6, bh6)) | 0;
	    lo = (lo + Math.imul(al5, bl7)) | 0;
	    mid = (mid + Math.imul(al5, bh7)) | 0;
	    mid = (mid + Math.imul(ah5, bl7)) | 0;
	    hi = (hi + Math.imul(ah5, bh7)) | 0;
	    lo = (lo + Math.imul(al4, bl8)) | 0;
	    mid = (mid + Math.imul(al4, bh8)) | 0;
	    mid = (mid + Math.imul(ah4, bl8)) | 0;
	    hi = (hi + Math.imul(ah4, bh8)) | 0;
	    lo = (lo + Math.imul(al3, bl9)) | 0;
	    mid = (mid + Math.imul(al3, bh9)) | 0;
	    mid = (mid + Math.imul(ah3, bl9)) | 0;
	    hi = (hi + Math.imul(ah3, bh9)) | 0;
	    var w12 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w12 >>> 26)) | 0;
	    w12 &= 0x3ffffff;
	    /* k = 13 */
	    lo = Math.imul(al9, bl4);
	    mid = Math.imul(al9, bh4);
	    mid = (mid + Math.imul(ah9, bl4)) | 0;
	    hi = Math.imul(ah9, bh4);
	    lo = (lo + Math.imul(al8, bl5)) | 0;
	    mid = (mid + Math.imul(al8, bh5)) | 0;
	    mid = (mid + Math.imul(ah8, bl5)) | 0;
	    hi = (hi + Math.imul(ah8, bh5)) | 0;
	    lo = (lo + Math.imul(al7, bl6)) | 0;
	    mid = (mid + Math.imul(al7, bh6)) | 0;
	    mid = (mid + Math.imul(ah7, bl6)) | 0;
	    hi = (hi + Math.imul(ah7, bh6)) | 0;
	    lo = (lo + Math.imul(al6, bl7)) | 0;
	    mid = (mid + Math.imul(al6, bh7)) | 0;
	    mid = (mid + Math.imul(ah6, bl7)) | 0;
	    hi = (hi + Math.imul(ah6, bh7)) | 0;
	    lo = (lo + Math.imul(al5, bl8)) | 0;
	    mid = (mid + Math.imul(al5, bh8)) | 0;
	    mid = (mid + Math.imul(ah5, bl8)) | 0;
	    hi = (hi + Math.imul(ah5, bh8)) | 0;
	    lo = (lo + Math.imul(al4, bl9)) | 0;
	    mid = (mid + Math.imul(al4, bh9)) | 0;
	    mid = (mid + Math.imul(ah4, bl9)) | 0;
	    hi = (hi + Math.imul(ah4, bh9)) | 0;
	    var w13 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w13 >>> 26)) | 0;
	    w13 &= 0x3ffffff;
	    /* k = 14 */
	    lo = Math.imul(al9, bl5);
	    mid = Math.imul(al9, bh5);
	    mid = (mid + Math.imul(ah9, bl5)) | 0;
	    hi = Math.imul(ah9, bh5);
	    lo = (lo + Math.imul(al8, bl6)) | 0;
	    mid = (mid + Math.imul(al8, bh6)) | 0;
	    mid = (mid + Math.imul(ah8, bl6)) | 0;
	    hi = (hi + Math.imul(ah8, bh6)) | 0;
	    lo = (lo + Math.imul(al7, bl7)) | 0;
	    mid = (mid + Math.imul(al7, bh7)) | 0;
	    mid = (mid + Math.imul(ah7, bl7)) | 0;
	    hi = (hi + Math.imul(ah7, bh7)) | 0;
	    lo = (lo + Math.imul(al6, bl8)) | 0;
	    mid = (mid + Math.imul(al6, bh8)) | 0;
	    mid = (mid + Math.imul(ah6, bl8)) | 0;
	    hi = (hi + Math.imul(ah6, bh8)) | 0;
	    lo = (lo + Math.imul(al5, bl9)) | 0;
	    mid = (mid + Math.imul(al5, bh9)) | 0;
	    mid = (mid + Math.imul(ah5, bl9)) | 0;
	    hi = (hi + Math.imul(ah5, bh9)) | 0;
	    var w14 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w14 >>> 26)) | 0;
	    w14 &= 0x3ffffff;
	    /* k = 15 */
	    lo = Math.imul(al9, bl6);
	    mid = Math.imul(al9, bh6);
	    mid = (mid + Math.imul(ah9, bl6)) | 0;
	    hi = Math.imul(ah9, bh6);
	    lo = (lo + Math.imul(al8, bl7)) | 0;
	    mid = (mid + Math.imul(al8, bh7)) | 0;
	    mid = (mid + Math.imul(ah8, bl7)) | 0;
	    hi = (hi + Math.imul(ah8, bh7)) | 0;
	    lo = (lo + Math.imul(al7, bl8)) | 0;
	    mid = (mid + Math.imul(al7, bh8)) | 0;
	    mid = (mid + Math.imul(ah7, bl8)) | 0;
	    hi = (hi + Math.imul(ah7, bh8)) | 0;
	    lo = (lo + Math.imul(al6, bl9)) | 0;
	    mid = (mid + Math.imul(al6, bh9)) | 0;
	    mid = (mid + Math.imul(ah6, bl9)) | 0;
	    hi = (hi + Math.imul(ah6, bh9)) | 0;
	    var w15 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w15 >>> 26)) | 0;
	    w15 &= 0x3ffffff;
	    /* k = 16 */
	    lo = Math.imul(al9, bl7);
	    mid = Math.imul(al9, bh7);
	    mid = (mid + Math.imul(ah9, bl7)) | 0;
	    hi = Math.imul(ah9, bh7);
	    lo = (lo + Math.imul(al8, bl8)) | 0;
	    mid = (mid + Math.imul(al8, bh8)) | 0;
	    mid = (mid + Math.imul(ah8, bl8)) | 0;
	    hi = (hi + Math.imul(ah8, bh8)) | 0;
	    lo = (lo + Math.imul(al7, bl9)) | 0;
	    mid = (mid + Math.imul(al7, bh9)) | 0;
	    mid = (mid + Math.imul(ah7, bl9)) | 0;
	    hi = (hi + Math.imul(ah7, bh9)) | 0;
	    var w16 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w16 >>> 26)) | 0;
	    w16 &= 0x3ffffff;
	    /* k = 17 */
	    lo = Math.imul(al9, bl8);
	    mid = Math.imul(al9, bh8);
	    mid = (mid + Math.imul(ah9, bl8)) | 0;
	    hi = Math.imul(ah9, bh8);
	    lo = (lo + Math.imul(al8, bl9)) | 0;
	    mid = (mid + Math.imul(al8, bh9)) | 0;
	    mid = (mid + Math.imul(ah8, bl9)) | 0;
	    hi = (hi + Math.imul(ah8, bh9)) | 0;
	    var w17 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w17 >>> 26)) | 0;
	    w17 &= 0x3ffffff;
	    /* k = 18 */
	    lo = Math.imul(al9, bl9);
	    mid = Math.imul(al9, bh9);
	    mid = (mid + Math.imul(ah9, bl9)) | 0;
	    hi = Math.imul(ah9, bh9);
	    var w18 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w18 >>> 26)) | 0;
	    w18 &= 0x3ffffff;
	    o[0] = w0;
	    o[1] = w1;
	    o[2] = w2;
	    o[3] = w3;
	    o[4] = w4;
	    o[5] = w5;
	    o[6] = w6;
	    o[7] = w7;
	    o[8] = w8;
	    o[9] = w9;
	    o[10] = w10;
	    o[11] = w11;
	    o[12] = w12;
	    o[13] = w13;
	    o[14] = w14;
	    o[15] = w15;
	    o[16] = w16;
	    o[17] = w17;
	    o[18] = w18;
	    if (c !== 0) {
	      o[19] = c;
	      out.length++;
	    }
	    return out;
	  };

	  // Polyfill comb
	  if (!Math.imul) {
	    comb10MulTo = smallMulTo;
	  }

	  function bigMulTo (self, num, out) {
	    out.negative = num.negative ^ self.negative;
	    out.length = self.length + num.length;

	    var carry = 0;
	    var hncarry = 0;
	    for (var k = 0; k < out.length - 1; k++) {
	      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
	      // note that ncarry could be >= 0x3ffffff
	      var ncarry = hncarry;
	      hncarry = 0;
	      var rword = carry & 0x3ffffff;
	      var maxJ = Math.min(k, num.length - 1);
	      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
	        var i = k - j;
	        var a = self.words[i] | 0;
	        var b = num.words[j] | 0;
	        var r = a * b;

	        var lo = r & 0x3ffffff;
	        ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
	        lo = (lo + rword) | 0;
	        rword = lo & 0x3ffffff;
	        ncarry = (ncarry + (lo >>> 26)) | 0;

	        hncarry += ncarry >>> 26;
	        ncarry &= 0x3ffffff;
	      }
	      out.words[k] = rword;
	      carry = ncarry;
	      ncarry = hncarry;
	    }
	    if (carry !== 0) {
	      out.words[k] = carry;
	    } else {
	      out.length--;
	    }

	    return out._strip();
	  }

	  function jumboMulTo (self, num, out) {
	    // Temporary disable, see https://github.com/indutny/bn.js/issues/211
	    // var fftm = new FFTM();
	    // return fftm.mulp(self, num, out);
	    return bigMulTo(self, num, out);
	  }

	  BN.prototype.mulTo = function mulTo (num, out) {
	    var res;
	    var len = this.length + num.length;
	    if (this.length === 10 && num.length === 10) {
	      res = comb10MulTo(this, num, out);
	    } else if (len < 63) {
	      res = smallMulTo(this, num, out);
	    } else if (len < 1024) {
	      res = bigMulTo(this, num, out);
	    } else {
	      res = jumboMulTo(this, num, out);
	    }

	    return res;
	  };

	  // Multiply `this` by `num`
	  BN.prototype.mul = function mul (num) {
	    var out = new BN(null);
	    out.words = new Array(this.length + num.length);
	    return this.mulTo(num, out);
	  };

	  // Multiply employing FFT
	  BN.prototype.mulf = function mulf (num) {
	    var out = new BN(null);
	    out.words = new Array(this.length + num.length);
	    return jumboMulTo(this, num, out);
	  };

	  // In-place Multiplication
	  BN.prototype.imul = function imul (num) {
	    return this.clone().mulTo(num, this);
	  };

	  BN.prototype.imuln = function imuln (num) {
	    var isNegNum = num < 0;
	    if (isNegNum) num = -num;

	    assert(typeof num === 'number');
	    assert(num < 0x4000000);

	    // Carry
	    var carry = 0;
	    for (var i = 0; i < this.length; i++) {
	      var w = (this.words[i] | 0) * num;
	      var lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
	      carry >>= 26;
	      carry += (w / 0x4000000) | 0;
	      // NOTE: lo is 27bit maximum
	      carry += lo >>> 26;
	      this.words[i] = lo & 0x3ffffff;
	    }

	    if (carry !== 0) {
	      this.words[i] = carry;
	      this.length++;
	    }

	    return isNegNum ? this.ineg() : this;
	  };

	  BN.prototype.muln = function muln (num) {
	    return this.clone().imuln(num);
	  };

	  // `this` * `this`
	  BN.prototype.sqr = function sqr () {
	    return this.mul(this);
	  };

	  // `this` * `this` in-place
	  BN.prototype.isqr = function isqr () {
	    return this.imul(this.clone());
	  };

	  // Math.pow(`this`, `num`)
	  BN.prototype.pow = function pow (num) {
	    var w = toBitArray(num);
	    if (w.length === 0) return new BN(1);

	    // Skip leading zeroes
	    var res = this;
	    for (var i = 0; i < w.length; i++, res = res.sqr()) {
	      if (w[i] !== 0) break;
	    }

	    if (++i < w.length) {
	      for (var q = res.sqr(); i < w.length; i++, q = q.sqr()) {
	        if (w[i] === 0) continue;

	        res = res.mul(q);
	      }
	    }

	    return res;
	  };

	  // Shift-left in-place
	  BN.prototype.iushln = function iushln (bits) {
	    assert(typeof bits === 'number' && bits >= 0);
	    var r = bits % 26;
	    var s = (bits - r) / 26;
	    var carryMask = (0x3ffffff >>> (26 - r)) << (26 - r);
	    var i;

	    if (r !== 0) {
	      var carry = 0;

	      for (i = 0; i < this.length; i++) {
	        var newCarry = this.words[i] & carryMask;
	        var c = ((this.words[i] | 0) - newCarry) << r;
	        this.words[i] = c | carry;
	        carry = newCarry >>> (26 - r);
	      }

	      if (carry) {
	        this.words[i] = carry;
	        this.length++;
	      }
	    }

	    if (s !== 0) {
	      for (i = this.length - 1; i >= 0; i--) {
	        this.words[i + s] = this.words[i];
	      }

	      for (i = 0; i < s; i++) {
	        this.words[i] = 0;
	      }

	      this.length += s;
	    }

	    return this._strip();
	  };

	  BN.prototype.ishln = function ishln (bits) {
	    // TODO(indutny): implement me
	    assert(this.negative === 0);
	    return this.iushln(bits);
	  };

	  // Shift-right in-place
	  // NOTE: `hint` is a lowest bit before trailing zeroes
	  // NOTE: if `extended` is present - it will be filled with destroyed bits
	  BN.prototype.iushrn = function iushrn (bits, hint, extended) {
	    assert(typeof bits === 'number' && bits >= 0);
	    var h;
	    if (hint) {
	      h = (hint - (hint % 26)) / 26;
	    } else {
	      h = 0;
	    }

	    var r = bits % 26;
	    var s = Math.min((bits - r) / 26, this.length);
	    var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
	    var maskedWords = extended;

	    h -= s;
	    h = Math.max(0, h);

	    // Extended mode, copy masked part
	    if (maskedWords) {
	      for (var i = 0; i < s; i++) {
	        maskedWords.words[i] = this.words[i];
	      }
	      maskedWords.length = s;
	    }

	    if (s === 0) ; else if (this.length > s) {
	      this.length -= s;
	      for (i = 0; i < this.length; i++) {
	        this.words[i] = this.words[i + s];
	      }
	    } else {
	      this.words[0] = 0;
	      this.length = 1;
	    }

	    var carry = 0;
	    for (i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
	      var word = this.words[i] | 0;
	      this.words[i] = (carry << (26 - r)) | (word >>> r);
	      carry = word & mask;
	    }

	    // Push carried bits as a mask
	    if (maskedWords && carry !== 0) {
	      maskedWords.words[maskedWords.length++] = carry;
	    }

	    if (this.length === 0) {
	      this.words[0] = 0;
	      this.length = 1;
	    }

	    return this._strip();
	  };

	  BN.prototype.ishrn = function ishrn (bits, hint, extended) {
	    // TODO(indutny): implement me
	    assert(this.negative === 0);
	    return this.iushrn(bits, hint, extended);
	  };

	  // Shift-left
	  BN.prototype.shln = function shln (bits) {
	    return this.clone().ishln(bits);
	  };

	  BN.prototype.ushln = function ushln (bits) {
	    return this.clone().iushln(bits);
	  };

	  // Shift-right
	  BN.prototype.shrn = function shrn (bits) {
	    return this.clone().ishrn(bits);
	  };

	  BN.prototype.ushrn = function ushrn (bits) {
	    return this.clone().iushrn(bits);
	  };

	  // Test if n bit is set
	  BN.prototype.testn = function testn (bit) {
	    assert(typeof bit === 'number' && bit >= 0);
	    var r = bit % 26;
	    var s = (bit - r) / 26;
	    var q = 1 << r;

	    // Fast case: bit is much higher than all existing words
	    if (this.length <= s) return false;

	    // Check bit and return
	    var w = this.words[s];

	    return !!(w & q);
	  };

	  // Return only lowers bits of number (in-place)
	  BN.prototype.imaskn = function imaskn (bits) {
	    assert(typeof bits === 'number' && bits >= 0);
	    var r = bits % 26;
	    var s = (bits - r) / 26;

	    assert(this.negative === 0, 'imaskn works only with positive numbers');

	    if (this.length <= s) {
	      return this;
	    }

	    if (r !== 0) {
	      s++;
	    }
	    this.length = Math.min(s, this.length);

	    if (r !== 0) {
	      var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
	      this.words[this.length - 1] &= mask;
	    }

	    return this._strip();
	  };

	  // Return only lowers bits of number
	  BN.prototype.maskn = function maskn (bits) {
	    return this.clone().imaskn(bits);
	  };

	  // Add plain number `num` to `this`
	  BN.prototype.iaddn = function iaddn (num) {
	    assert(typeof num === 'number');
	    assert(num < 0x4000000);
	    if (num < 0) return this.isubn(-num);

	    // Possible sign change
	    if (this.negative !== 0) {
	      if (this.length === 1 && (this.words[0] | 0) <= num) {
	        this.words[0] = num - (this.words[0] | 0);
	        this.negative = 0;
	        return this;
	      }

	      this.negative = 0;
	      this.isubn(num);
	      this.negative = 1;
	      return this;
	    }

	    // Add without checks
	    return this._iaddn(num);
	  };

	  BN.prototype._iaddn = function _iaddn (num) {
	    this.words[0] += num;

	    // Carry
	    for (var i = 0; i < this.length && this.words[i] >= 0x4000000; i++) {
	      this.words[i] -= 0x4000000;
	      if (i === this.length - 1) {
	        this.words[i + 1] = 1;
	      } else {
	        this.words[i + 1]++;
	      }
	    }
	    this.length = Math.max(this.length, i + 1);

	    return this;
	  };

	  // Subtract plain number `num` from `this`
	  BN.prototype.isubn = function isubn (num) {
	    assert(typeof num === 'number');
	    assert(num < 0x4000000);
	    if (num < 0) return this.iaddn(-num);

	    if (this.negative !== 0) {
	      this.negative = 0;
	      this.iaddn(num);
	      this.negative = 1;
	      return this;
	    }

	    this.words[0] -= num;

	    if (this.length === 1 && this.words[0] < 0) {
	      this.words[0] = -this.words[0];
	      this.negative = 1;
	    } else {
	      // Carry
	      for (var i = 0; i < this.length && this.words[i] < 0; i++) {
	        this.words[i] += 0x4000000;
	        this.words[i + 1] -= 1;
	      }
	    }

	    return this._strip();
	  };

	  BN.prototype.addn = function addn (num) {
	    return this.clone().iaddn(num);
	  };

	  BN.prototype.subn = function subn (num) {
	    return this.clone().isubn(num);
	  };

	  BN.prototype.iabs = function iabs () {
	    this.negative = 0;

	    return this;
	  };

	  BN.prototype.abs = function abs () {
	    return this.clone().iabs();
	  };

	  BN.prototype._ishlnsubmul = function _ishlnsubmul (num, mul, shift) {
	    var len = num.length + shift;
	    var i;

	    this._expand(len);

	    var w;
	    var carry = 0;
	    for (i = 0; i < num.length; i++) {
	      w = (this.words[i + shift] | 0) + carry;
	      var right = (num.words[i] | 0) * mul;
	      w -= right & 0x3ffffff;
	      carry = (w >> 26) - ((right / 0x4000000) | 0);
	      this.words[i + shift] = w & 0x3ffffff;
	    }
	    for (; i < this.length - shift; i++) {
	      w = (this.words[i + shift] | 0) + carry;
	      carry = w >> 26;
	      this.words[i + shift] = w & 0x3ffffff;
	    }

	    if (carry === 0) return this._strip();

	    // Subtraction overflow
	    assert(carry === -1);
	    carry = 0;
	    for (i = 0; i < this.length; i++) {
	      w = -(this.words[i] | 0) + carry;
	      carry = w >> 26;
	      this.words[i] = w & 0x3ffffff;
	    }
	    this.negative = 1;

	    return this._strip();
	  };

	  BN.prototype._wordDiv = function _wordDiv (num, mode) {
	    var shift = this.length - num.length;

	    var a = this.clone();
	    var b = num;

	    // Normalize
	    var bhi = b.words[b.length - 1] | 0;
	    var bhiBits = this._countBits(bhi);
	    shift = 26 - bhiBits;
	    if (shift !== 0) {
	      b = b.ushln(shift);
	      a.iushln(shift);
	      bhi = b.words[b.length - 1] | 0;
	    }

	    // Initialize quotient
	    var m = a.length - b.length;
	    var q;

	    if (mode !== 'mod') {
	      q = new BN(null);
	      q.length = m + 1;
	      q.words = new Array(q.length);
	      for (var i = 0; i < q.length; i++) {
	        q.words[i] = 0;
	      }
	    }

	    var diff = a.clone()._ishlnsubmul(b, 1, m);
	    if (diff.negative === 0) {
	      a = diff;
	      if (q) {
	        q.words[m] = 1;
	      }
	    }

	    for (var j = m - 1; j >= 0; j--) {
	      var qj = (a.words[b.length + j] | 0) * 0x4000000 +
	        (a.words[b.length + j - 1] | 0);

	      // NOTE: (qj / bhi) is (0x3ffffff * 0x4000000 + 0x3ffffff) / 0x2000000 max
	      // (0x7ffffff)
	      qj = Math.min((qj / bhi) | 0, 0x3ffffff);

	      a._ishlnsubmul(b, qj, j);
	      while (a.negative !== 0) {
	        qj--;
	        a.negative = 0;
	        a._ishlnsubmul(b, 1, j);
	        if (!a.isZero()) {
	          a.negative ^= 1;
	        }
	      }
	      if (q) {
	        q.words[j] = qj;
	      }
	    }
	    if (q) {
	      q._strip();
	    }
	    a._strip();

	    // Denormalize
	    if (mode !== 'div' && shift !== 0) {
	      a.iushrn(shift);
	    }

	    return {
	      div: q || null,
	      mod: a
	    };
	  };

	  // NOTE: 1) `mode` can be set to `mod` to request mod only,
	  //       to `div` to request div only, or be absent to
	  //       request both div & mod
	  //       2) `positive` is true if unsigned mod is requested
	  BN.prototype.divmod = function divmod (num, mode, positive) {
	    assert(!num.isZero());

	    if (this.isZero()) {
	      return {
	        div: new BN(0),
	        mod: new BN(0)
	      };
	    }

	    var div, mod, res;
	    if (this.negative !== 0 && num.negative === 0) {
	      res = this.neg().divmod(num, mode);

	      if (mode !== 'mod') {
	        div = res.div.neg();
	      }

	      if (mode !== 'div') {
	        mod = res.mod.neg();
	        if (positive && mod.negative !== 0) {
	          mod.iadd(num);
	        }
	      }

	      return {
	        div: div,
	        mod: mod
	      };
	    }

	    if (this.negative === 0 && num.negative !== 0) {
	      res = this.divmod(num.neg(), mode);

	      if (mode !== 'mod') {
	        div = res.div.neg();
	      }

	      return {
	        div: div,
	        mod: res.mod
	      };
	    }

	    if ((this.negative & num.negative) !== 0) {
	      res = this.neg().divmod(num.neg(), mode);

	      if (mode !== 'div') {
	        mod = res.mod.neg();
	        if (positive && mod.negative !== 0) {
	          mod.isub(num);
	        }
	      }

	      return {
	        div: res.div,
	        mod: mod
	      };
	    }

	    // Both numbers are positive at this point

	    // Strip both numbers to approximate shift value
	    if (num.length > this.length || this.cmp(num) < 0) {
	      return {
	        div: new BN(0),
	        mod: this
	      };
	    }

	    // Very short reduction
	    if (num.length === 1) {
	      if (mode === 'div') {
	        return {
	          div: this.divn(num.words[0]),
	          mod: null
	        };
	      }

	      if (mode === 'mod') {
	        return {
	          div: null,
	          mod: new BN(this.modrn(num.words[0]))
	        };
	      }

	      return {
	        div: this.divn(num.words[0]),
	        mod: new BN(this.modrn(num.words[0]))
	      };
	    }

	    return this._wordDiv(num, mode);
	  };

	  // Find `this` / `num`
	  BN.prototype.div = function div (num) {
	    return this.divmod(num, 'div', false).div;
	  };

	  // Find `this` % `num`
	  BN.prototype.mod = function mod (num) {
	    return this.divmod(num, 'mod', false).mod;
	  };

	  BN.prototype.umod = function umod (num) {
	    return this.divmod(num, 'mod', true).mod;
	  };

	  // Find Round(`this` / `num`)
	  BN.prototype.divRound = function divRound (num) {
	    var dm = this.divmod(num);

	    // Fast case - exact division
	    if (dm.mod.isZero()) return dm.div;

	    var mod = dm.div.negative !== 0 ? dm.mod.isub(num) : dm.mod;

	    var half = num.ushrn(1);
	    var r2 = num.andln(1);
	    var cmp = mod.cmp(half);

	    // Round down
	    if (cmp < 0 || (r2 === 1 && cmp === 0)) return dm.div;

	    // Round up
	    return dm.div.negative !== 0 ? dm.div.isubn(1) : dm.div.iaddn(1);
	  };

	  BN.prototype.modrn = function modrn (num) {
	    var isNegNum = num < 0;
	    if (isNegNum) num = -num;

	    assert(num <= 0x3ffffff);
	    var p = (1 << 26) % num;

	    var acc = 0;
	    for (var i = this.length - 1; i >= 0; i--) {
	      acc = (p * acc + (this.words[i] | 0)) % num;
	    }

	    return isNegNum ? -acc : acc;
	  };

	  // WARNING: DEPRECATED
	  BN.prototype.modn = function modn (num) {
	    return this.modrn(num);
	  };

	  // In-place division by number
	  BN.prototype.idivn = function idivn (num) {
	    var isNegNum = num < 0;
	    if (isNegNum) num = -num;

	    assert(num <= 0x3ffffff);

	    var carry = 0;
	    for (var i = this.length - 1; i >= 0; i--) {
	      var w = (this.words[i] | 0) + carry * 0x4000000;
	      this.words[i] = (w / num) | 0;
	      carry = w % num;
	    }

	    this._strip();
	    return isNegNum ? this.ineg() : this;
	  };

	  BN.prototype.divn = function divn (num) {
	    return this.clone().idivn(num);
	  };

	  BN.prototype.egcd = function egcd (p) {
	    assert(p.negative === 0);
	    assert(!p.isZero());

	    var x = this;
	    var y = p.clone();

	    if (x.negative !== 0) {
	      x = x.umod(p);
	    } else {
	      x = x.clone();
	    }

	    // A * x + B * y = x
	    var A = new BN(1);
	    var B = new BN(0);

	    // C * x + D * y = y
	    var C = new BN(0);
	    var D = new BN(1);

	    var g = 0;

	    while (x.isEven() && y.isEven()) {
	      x.iushrn(1);
	      y.iushrn(1);
	      ++g;
	    }

	    var yp = y.clone();
	    var xp = x.clone();

	    while (!x.isZero()) {
	      for (var i = 0, im = 1; (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
	      if (i > 0) {
	        x.iushrn(i);
	        while (i-- > 0) {
	          if (A.isOdd() || B.isOdd()) {
	            A.iadd(yp);
	            B.isub(xp);
	          }

	          A.iushrn(1);
	          B.iushrn(1);
	        }
	      }

	      for (var j = 0, jm = 1; (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
	      if (j > 0) {
	        y.iushrn(j);
	        while (j-- > 0) {
	          if (C.isOdd() || D.isOdd()) {
	            C.iadd(yp);
	            D.isub(xp);
	          }

	          C.iushrn(1);
	          D.iushrn(1);
	        }
	      }

	      if (x.cmp(y) >= 0) {
	        x.isub(y);
	        A.isub(C);
	        B.isub(D);
	      } else {
	        y.isub(x);
	        C.isub(A);
	        D.isub(B);
	      }
	    }

	    return {
	      a: C,
	      b: D,
	      gcd: y.iushln(g)
	    };
	  };

	  // This is reduced incarnation of the binary EEA
	  // above, designated to invert members of the
	  // _prime_ fields F(p) at a maximal speed
	  BN.prototype._invmp = function _invmp (p) {
	    assert(p.negative === 0);
	    assert(!p.isZero());

	    var a = this;
	    var b = p.clone();

	    if (a.negative !== 0) {
	      a = a.umod(p);
	    } else {
	      a = a.clone();
	    }

	    var x1 = new BN(1);
	    var x2 = new BN(0);

	    var delta = b.clone();

	    while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
	      for (var i = 0, im = 1; (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
	      if (i > 0) {
	        a.iushrn(i);
	        while (i-- > 0) {
	          if (x1.isOdd()) {
	            x1.iadd(delta);
	          }

	          x1.iushrn(1);
	        }
	      }

	      for (var j = 0, jm = 1; (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
	      if (j > 0) {
	        b.iushrn(j);
	        while (j-- > 0) {
	          if (x2.isOdd()) {
	            x2.iadd(delta);
	          }

	          x2.iushrn(1);
	        }
	      }

	      if (a.cmp(b) >= 0) {
	        a.isub(b);
	        x1.isub(x2);
	      } else {
	        b.isub(a);
	        x2.isub(x1);
	      }
	    }

	    var res;
	    if (a.cmpn(1) === 0) {
	      res = x1;
	    } else {
	      res = x2;
	    }

	    if (res.cmpn(0) < 0) {
	      res.iadd(p);
	    }

	    return res;
	  };

	  BN.prototype.gcd = function gcd (num) {
	    if (this.isZero()) return num.abs();
	    if (num.isZero()) return this.abs();

	    var a = this.clone();
	    var b = num.clone();
	    a.negative = 0;
	    b.negative = 0;

	    // Remove common factor of two
	    for (var shift = 0; a.isEven() && b.isEven(); shift++) {
	      a.iushrn(1);
	      b.iushrn(1);
	    }

	    do {
	      while (a.isEven()) {
	        a.iushrn(1);
	      }
	      while (b.isEven()) {
	        b.iushrn(1);
	      }

	      var r = a.cmp(b);
	      if (r < 0) {
	        // Swap `a` and `b` to make `a` always bigger than `b`
	        var t = a;
	        a = b;
	        b = t;
	      } else if (r === 0 || b.cmpn(1) === 0) {
	        break;
	      }

	      a.isub(b);
	    } while (true);

	    return b.iushln(shift);
	  };

	  // Invert number in the field F(num)
	  BN.prototype.invm = function invm (num) {
	    return this.egcd(num).a.umod(num);
	  };

	  BN.prototype.isEven = function isEven () {
	    return (this.words[0] & 1) === 0;
	  };

	  BN.prototype.isOdd = function isOdd () {
	    return (this.words[0] & 1) === 1;
	  };

	  // And first word and num
	  BN.prototype.andln = function andln (num) {
	    return this.words[0] & num;
	  };

	  // Increment at the bit position in-line
	  BN.prototype.bincn = function bincn (bit) {
	    assert(typeof bit === 'number');
	    var r = bit % 26;
	    var s = (bit - r) / 26;
	    var q = 1 << r;

	    // Fast case: bit is much higher than all existing words
	    if (this.length <= s) {
	      this._expand(s + 1);
	      this.words[s] |= q;
	      return this;
	    }

	    // Add bit and propagate, if needed
	    var carry = q;
	    for (var i = s; carry !== 0 && i < this.length; i++) {
	      var w = this.words[i] | 0;
	      w += carry;
	      carry = w >>> 26;
	      w &= 0x3ffffff;
	      this.words[i] = w;
	    }
	    if (carry !== 0) {
	      this.words[i] = carry;
	      this.length++;
	    }
	    return this;
	  };

	  BN.prototype.isZero = function isZero () {
	    return this.length === 1 && this.words[0] === 0;
	  };

	  BN.prototype.cmpn = function cmpn (num) {
	    var negative = num < 0;

	    if (this.negative !== 0 && !negative) return -1;
	    if (this.negative === 0 && negative) return 1;

	    this._strip();

	    var res;
	    if (this.length > 1) {
	      res = 1;
	    } else {
	      if (negative) {
	        num = -num;
	      }

	      assert(num <= 0x3ffffff, 'Number is too big');

	      var w = this.words[0] | 0;
	      res = w === num ? 0 : w < num ? -1 : 1;
	    }
	    if (this.negative !== 0) return -res | 0;
	    return res;
	  };

	  // Compare two numbers and return:
	  // 1 - if `this` > `num`
	  // 0 - if `this` == `num`
	  // -1 - if `this` < `num`
	  BN.prototype.cmp = function cmp (num) {
	    if (this.negative !== 0 && num.negative === 0) return -1;
	    if (this.negative === 0 && num.negative !== 0) return 1;

	    var res = this.ucmp(num);
	    if (this.negative !== 0) return -res | 0;
	    return res;
	  };

	  // Unsigned comparison
	  BN.prototype.ucmp = function ucmp (num) {
	    // At this point both numbers have the same sign
	    if (this.length > num.length) return 1;
	    if (this.length < num.length) return -1;

	    var res = 0;
	    for (var i = this.length - 1; i >= 0; i--) {
	      var a = this.words[i] | 0;
	      var b = num.words[i] | 0;

	      if (a === b) continue;
	      if (a < b) {
	        res = -1;
	      } else if (a > b) {
	        res = 1;
	      }
	      break;
	    }
	    return res;
	  };

	  BN.prototype.gtn = function gtn (num) {
	    return this.cmpn(num) === 1;
	  };

	  BN.prototype.gt = function gt (num) {
	    return this.cmp(num) === 1;
	  };

	  BN.prototype.gten = function gten (num) {
	    return this.cmpn(num) >= 0;
	  };

	  BN.prototype.gte = function gte (num) {
	    return this.cmp(num) >= 0;
	  };

	  BN.prototype.ltn = function ltn (num) {
	    return this.cmpn(num) === -1;
	  };

	  BN.prototype.lt = function lt (num) {
	    return this.cmp(num) === -1;
	  };

	  BN.prototype.lten = function lten (num) {
	    return this.cmpn(num) <= 0;
	  };

	  BN.prototype.lte = function lte (num) {
	    return this.cmp(num) <= 0;
	  };

	  BN.prototype.eqn = function eqn (num) {
	    return this.cmpn(num) === 0;
	  };

	  BN.prototype.eq = function eq (num) {
	    return this.cmp(num) === 0;
	  };

	  //
	  // A reduce context, could be using montgomery or something better, depending
	  // on the `m` itself.
	  //
	  BN.red = function red (num) {
	    return new Red(num);
	  };

	  BN.prototype.toRed = function toRed (ctx) {
	    assert(!this.red, 'Already a number in reduction context');
	    assert(this.negative === 0, 'red works only with positives');
	    return ctx.convertTo(this)._forceRed(ctx);
	  };

	  BN.prototype.fromRed = function fromRed () {
	    assert(this.red, 'fromRed works only with numbers in reduction context');
	    return this.red.convertFrom(this);
	  };

	  BN.prototype._forceRed = function _forceRed (ctx) {
	    this.red = ctx;
	    return this;
	  };

	  BN.prototype.forceRed = function forceRed (ctx) {
	    assert(!this.red, 'Already a number in reduction context');
	    return this._forceRed(ctx);
	  };

	  BN.prototype.redAdd = function redAdd (num) {
	    assert(this.red, 'redAdd works only with red numbers');
	    return this.red.add(this, num);
	  };

	  BN.prototype.redIAdd = function redIAdd (num) {
	    assert(this.red, 'redIAdd works only with red numbers');
	    return this.red.iadd(this, num);
	  };

	  BN.prototype.redSub = function redSub (num) {
	    assert(this.red, 'redSub works only with red numbers');
	    return this.red.sub(this, num);
	  };

	  BN.prototype.redISub = function redISub (num) {
	    assert(this.red, 'redISub works only with red numbers');
	    return this.red.isub(this, num);
	  };

	  BN.prototype.redShl = function redShl (num) {
	    assert(this.red, 'redShl works only with red numbers');
	    return this.red.shl(this, num);
	  };

	  BN.prototype.redMul = function redMul (num) {
	    assert(this.red, 'redMul works only with red numbers');
	    this.red._verify2(this, num);
	    return this.red.mul(this, num);
	  };

	  BN.prototype.redIMul = function redIMul (num) {
	    assert(this.red, 'redMul works only with red numbers');
	    this.red._verify2(this, num);
	    return this.red.imul(this, num);
	  };

	  BN.prototype.redSqr = function redSqr () {
	    assert(this.red, 'redSqr works only with red numbers');
	    this.red._verify1(this);
	    return this.red.sqr(this);
	  };

	  BN.prototype.redISqr = function redISqr () {
	    assert(this.red, 'redISqr works only with red numbers');
	    this.red._verify1(this);
	    return this.red.isqr(this);
	  };

	  // Square root over p
	  BN.prototype.redSqrt = function redSqrt () {
	    assert(this.red, 'redSqrt works only with red numbers');
	    this.red._verify1(this);
	    return this.red.sqrt(this);
	  };

	  BN.prototype.redInvm = function redInvm () {
	    assert(this.red, 'redInvm works only with red numbers');
	    this.red._verify1(this);
	    return this.red.invm(this);
	  };

	  // Return negative clone of `this` % `red modulo`
	  BN.prototype.redNeg = function redNeg () {
	    assert(this.red, 'redNeg works only with red numbers');
	    this.red._verify1(this);
	    return this.red.neg(this);
	  };

	  BN.prototype.redPow = function redPow (num) {
	    assert(this.red && !num.red, 'redPow(normalNum)');
	    this.red._verify1(this);
	    return this.red.pow(this, num);
	  };

	  // Prime numbers with efficient reduction
	  var primes = {
	    k256: null,
	    p224: null,
	    p192: null,
	    p25519: null
	  };

	  // Pseudo-Mersenne prime
	  function MPrime (name, p) {
	    // P = 2 ^ N - K
	    this.name = name;
	    this.p = new BN(p, 16);
	    this.n = this.p.bitLength();
	    this.k = new BN(1).iushln(this.n).isub(this.p);

	    this.tmp = this._tmp();
	  }

	  MPrime.prototype._tmp = function _tmp () {
	    var tmp = new BN(null);
	    tmp.words = new Array(Math.ceil(this.n / 13));
	    return tmp;
	  };

	  MPrime.prototype.ireduce = function ireduce (num) {
	    // Assumes that `num` is less than `P^2`
	    // num = HI * (2 ^ N - K) + HI * K + LO = HI * K + LO (mod P)
	    var r = num;
	    var rlen;

	    do {
	      this.split(r, this.tmp);
	      r = this.imulK(r);
	      r = r.iadd(this.tmp);
	      rlen = r.bitLength();
	    } while (rlen > this.n);

	    var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
	    if (cmp === 0) {
	      r.words[0] = 0;
	      r.length = 1;
	    } else if (cmp > 0) {
	      r.isub(this.p);
	    } else {
	      if (r.strip !== undefined) {
	        // r is a BN v4 instance
	        r.strip();
	      } else {
	        // r is a BN v5 instance
	        r._strip();
	      }
	    }

	    return r;
	  };

	  MPrime.prototype.split = function split (input, out) {
	    input.iushrn(this.n, 0, out);
	  };

	  MPrime.prototype.imulK = function imulK (num) {
	    return num.imul(this.k);
	  };

	  function K256 () {
	    MPrime.call(
	      this,
	      'k256',
	      'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f');
	  }
	  inherits(K256, MPrime);

	  K256.prototype.split = function split (input, output) {
	    // 256 = 9 * 26 + 22
	    var mask = 0x3fffff;

	    var outLen = Math.min(input.length, 9);
	    for (var i = 0; i < outLen; i++) {
	      output.words[i] = input.words[i];
	    }
	    output.length = outLen;

	    if (input.length <= 9) {
	      input.words[0] = 0;
	      input.length = 1;
	      return;
	    }

	    // Shift by 9 limbs
	    var prev = input.words[9];
	    output.words[output.length++] = prev & mask;

	    for (i = 10; i < input.length; i++) {
	      var next = input.words[i] | 0;
	      input.words[i - 10] = ((next & mask) << 4) | (prev >>> 22);
	      prev = next;
	    }
	    prev >>>= 22;
	    input.words[i - 10] = prev;
	    if (prev === 0 && input.length > 10) {
	      input.length -= 10;
	    } else {
	      input.length -= 9;
	    }
	  };

	  K256.prototype.imulK = function imulK (num) {
	    // K = 0x1000003d1 = [ 0x40, 0x3d1 ]
	    num.words[num.length] = 0;
	    num.words[num.length + 1] = 0;
	    num.length += 2;

	    // bounded at: 0x40 * 0x3ffffff + 0x3d0 = 0x100000390
	    var lo = 0;
	    for (var i = 0; i < num.length; i++) {
	      var w = num.words[i] | 0;
	      lo += w * 0x3d1;
	      num.words[i] = lo & 0x3ffffff;
	      lo = w * 0x40 + ((lo / 0x4000000) | 0);
	    }

	    // Fast length reduction
	    if (num.words[num.length - 1] === 0) {
	      num.length--;
	      if (num.words[num.length - 1] === 0) {
	        num.length--;
	      }
	    }
	    return num;
	  };

	  function P224 () {
	    MPrime.call(
	      this,
	      'p224',
	      'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001');
	  }
	  inherits(P224, MPrime);

	  function P192 () {
	    MPrime.call(
	      this,
	      'p192',
	      'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff');
	  }
	  inherits(P192, MPrime);

	  function P25519 () {
	    // 2 ^ 255 - 19
	    MPrime.call(
	      this,
	      '25519',
	      '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed');
	  }
	  inherits(P25519, MPrime);

	  P25519.prototype.imulK = function imulK (num) {
	    // K = 0x13
	    var carry = 0;
	    for (var i = 0; i < num.length; i++) {
	      var hi = (num.words[i] | 0) * 0x13 + carry;
	      var lo = hi & 0x3ffffff;
	      hi >>>= 26;

	      num.words[i] = lo;
	      carry = hi;
	    }
	    if (carry !== 0) {
	      num.words[num.length++] = carry;
	    }
	    return num;
	  };

	  // Exported mostly for testing purposes, use plain name instead
	  BN._prime = function prime (name) {
	    // Cached version of prime
	    if (primes[name]) return primes[name];

	    var prime;
	    if (name === 'k256') {
	      prime = new K256();
	    } else if (name === 'p224') {
	      prime = new P224();
	    } else if (name === 'p192') {
	      prime = new P192();
	    } else if (name === 'p25519') {
	      prime = new P25519();
	    } else {
	      throw new Error('Unknown prime ' + name);
	    }
	    primes[name] = prime;

	    return prime;
	  };

	  //
	  // Base reduction engine
	  //
	  function Red (m) {
	    if (typeof m === 'string') {
	      var prime = BN._prime(m);
	      this.m = prime.p;
	      this.prime = prime;
	    } else {
	      assert(m.gtn(1), 'modulus must be greater than 1');
	      this.m = m;
	      this.prime = null;
	    }
	  }

	  Red.prototype._verify1 = function _verify1 (a) {
	    assert(a.negative === 0, 'red works only with positives');
	    assert(a.red, 'red works only with red numbers');
	  };

	  Red.prototype._verify2 = function _verify2 (a, b) {
	    assert((a.negative | b.negative) === 0, 'red works only with positives');
	    assert(a.red && a.red === b.red,
	      'red works only with red numbers');
	  };

	  Red.prototype.imod = function imod (a) {
	    if (this.prime) return this.prime.ireduce(a)._forceRed(this);

	    move(a, a.umod(this.m)._forceRed(this));
	    return a;
	  };

	  Red.prototype.neg = function neg (a) {
	    if (a.isZero()) {
	      return a.clone();
	    }

	    return this.m.sub(a)._forceRed(this);
	  };

	  Red.prototype.add = function add (a, b) {
	    this._verify2(a, b);

	    var res = a.add(b);
	    if (res.cmp(this.m) >= 0) {
	      res.isub(this.m);
	    }
	    return res._forceRed(this);
	  };

	  Red.prototype.iadd = function iadd (a, b) {
	    this._verify2(a, b);

	    var res = a.iadd(b);
	    if (res.cmp(this.m) >= 0) {
	      res.isub(this.m);
	    }
	    return res;
	  };

	  Red.prototype.sub = function sub (a, b) {
	    this._verify2(a, b);

	    var res = a.sub(b);
	    if (res.cmpn(0) < 0) {
	      res.iadd(this.m);
	    }
	    return res._forceRed(this);
	  };

	  Red.prototype.isub = function isub (a, b) {
	    this._verify2(a, b);

	    var res = a.isub(b);
	    if (res.cmpn(0) < 0) {
	      res.iadd(this.m);
	    }
	    return res;
	  };

	  Red.prototype.shl = function shl (a, num) {
	    this._verify1(a);
	    return this.imod(a.ushln(num));
	  };

	  Red.prototype.imul = function imul (a, b) {
	    this._verify2(a, b);
	    return this.imod(a.imul(b));
	  };

	  Red.prototype.mul = function mul (a, b) {
	    this._verify2(a, b);
	    return this.imod(a.mul(b));
	  };

	  Red.prototype.isqr = function isqr (a) {
	    return this.imul(a, a.clone());
	  };

	  Red.prototype.sqr = function sqr (a) {
	    return this.mul(a, a);
	  };

	  Red.prototype.sqrt = function sqrt (a) {
	    if (a.isZero()) return a.clone();

	    var mod3 = this.m.andln(3);
	    assert(mod3 % 2 === 1);

	    // Fast case
	    if (mod3 === 3) {
	      var pow = this.m.add(new BN(1)).iushrn(2);
	      return this.pow(a, pow);
	    }

	    // Tonelli-Shanks algorithm (Totally unoptimized and slow)
	    //
	    // Find Q and S, that Q * 2 ^ S = (P - 1)
	    var q = this.m.subn(1);
	    var s = 0;
	    while (!q.isZero() && q.andln(1) === 0) {
	      s++;
	      q.iushrn(1);
	    }
	    assert(!q.isZero());

	    var one = new BN(1).toRed(this);
	    var nOne = one.redNeg();

	    // Find quadratic non-residue
	    // NOTE: Max is such because of generalized Riemann hypothesis.
	    var lpow = this.m.subn(1).iushrn(1);
	    var z = this.m.bitLength();
	    z = new BN(2 * z * z).toRed(this);

	    while (this.pow(z, lpow).cmp(nOne) !== 0) {
	      z.redIAdd(nOne);
	    }

	    var c = this.pow(z, q);
	    var r = this.pow(a, q.addn(1).iushrn(1));
	    var t = this.pow(a, q);
	    var m = s;
	    while (t.cmp(one) !== 0) {
	      var tmp = t;
	      for (var i = 0; tmp.cmp(one) !== 0; i++) {
	        tmp = tmp.redSqr();
	      }
	      assert(i < m);
	      var b = this.pow(c, new BN(1).iushln(m - i - 1));

	      r = r.redMul(b);
	      c = b.redSqr();
	      t = t.redMul(c);
	      m = i;
	    }

	    return r;
	  };

	  Red.prototype.invm = function invm (a) {
	    var inv = a._invmp(this.m);
	    if (inv.negative !== 0) {
	      inv.negative = 0;
	      return this.imod(inv).redNeg();
	    } else {
	      return this.imod(inv);
	    }
	  };

	  Red.prototype.pow = function pow (a, num) {
	    if (num.isZero()) return new BN(1).toRed(this);
	    if (num.cmpn(1) === 0) return a.clone();

	    var windowSize = 4;
	    var wnd = new Array(1 << windowSize);
	    wnd[0] = new BN(1).toRed(this);
	    wnd[1] = a;
	    for (var i = 2; i < wnd.length; i++) {
	      wnd[i] = this.mul(wnd[i - 1], a);
	    }

	    var res = wnd[0];
	    var current = 0;
	    var currentLen = 0;
	    var start = num.bitLength() % 26;
	    if (start === 0) {
	      start = 26;
	    }

	    for (i = num.length - 1; i >= 0; i--) {
	      var word = num.words[i];
	      for (var j = start - 1; j >= 0; j--) {
	        var bit = (word >> j) & 1;
	        if (res !== wnd[0]) {
	          res = this.sqr(res);
	        }

	        if (bit === 0 && current === 0) {
	          currentLen = 0;
	          continue;
	        }

	        current <<= 1;
	        current |= bit;
	        currentLen++;
	        if (currentLen !== windowSize && (i !== 0 || j !== 0)) continue;

	        res = this.mul(res, wnd[current]);
	        currentLen = 0;
	        current = 0;
	      }
	      start = 26;
	    }

	    return res;
	  };

	  Red.prototype.convertTo = function convertTo (num) {
	    var r = num.umod(this.m);

	    return r === num ? r.clone() : r;
	  };

	  Red.prototype.convertFrom = function convertFrom (num) {
	    var res = num.clone();
	    res.red = null;
	    return res;
	  };

	  //
	  // Montgomery method engine
	  //

	  BN.mont = function mont (num) {
	    return new Mont(num);
	  };

	  function Mont (m) {
	    Red.call(this, m);

	    this.shift = this.m.bitLength();
	    if (this.shift % 26 !== 0) {
	      this.shift += 26 - (this.shift % 26);
	    }

	    this.r = new BN(1).iushln(this.shift);
	    this.r2 = this.imod(this.r.sqr());
	    this.rinv = this.r._invmp(this.m);

	    this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
	    this.minv = this.minv.umod(this.r);
	    this.minv = this.r.sub(this.minv);
	  }
	  inherits(Mont, Red);

	  Mont.prototype.convertTo = function convertTo (num) {
	    return this.imod(num.ushln(this.shift));
	  };

	  Mont.prototype.convertFrom = function convertFrom (num) {
	    var r = this.imod(num.mul(this.rinv));
	    r.red = null;
	    return r;
	  };

	  Mont.prototype.imul = function imul (a, b) {
	    if (a.isZero() || b.isZero()) {
	      a.words[0] = 0;
	      a.length = 1;
	      return a;
	    }

	    var t = a.imul(b);
	    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
	    var u = t.isub(c).iushrn(this.shift);
	    var res = u;

	    if (u.cmp(this.m) >= 0) {
	      res = u.isub(this.m);
	    } else if (u.cmpn(0) < 0) {
	      res = u.iadd(this.m);
	    }

	    return res._forceRed(this);
	  };

	  Mont.prototype.mul = function mul (a, b) {
	    if (a.isZero() || b.isZero()) return new BN(0)._forceRed(this);

	    var t = a.mul(b);
	    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
	    var u = t.isub(c).iushrn(this.shift);
	    var res = u;
	    if (u.cmp(this.m) >= 0) {
	      res = u.isub(this.m);
	    } else if (u.cmpn(0) < 0) {
	      res = u.iadd(this.m);
	    }

	    return res._forceRed(this);
	  };

	  Mont.prototype.invm = function invm (a) {
	    // (AR)^-1 * R^2 = (A^-1 * R^-1) * R^2 = A^-1 * R
	    var res = this.imod(a._invmp(this.m).mul(this.r2));
	    return res._forceRed(this);
	  };
	})(module, commonjsGlobal);
} (bn));

var __importDefault$5 = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(InternalMessage$1, "__esModule", { value: true });
InternalMessage$1.InternalMessage = void 0;
const bn_js_1$2 = __importDefault$5(bn.exports);
class InternalMessage {
    constructor(opts) {
        this.to = opts.to;
        this.value = new bn_js_1$2.default(opts.value);
        this.bounce = opts.bounce;
        this.body = opts.body;
        if (opts.from) {
            this.from = opts.from;
        }
        else {
            this.from = null;
        }
        if (opts.ihrDisabled !== null && opts.ihrDisabled !== undefined) {
            this.ihrDisabled = opts.ihrDisabled;
        }
        else {
            this.ihrDisabled = true;
        }
        if (opts.bounced !== null && opts.bounced !== undefined) {
            this.bounced = opts.bounced;
        }
        else {
            this.bounced = false;
        }
        if (opts.ihrFees !== null && opts.ihrFees !== undefined) {
            this.ihrFees = new bn_js_1$2.default(opts.ihrFees);
        }
        else {
            this.ihrFees = new bn_js_1$2.default(0);
        }
        if (opts.fwdFees !== null && opts.fwdFees !== undefined) {
            this.fwdFees = new bn_js_1$2.default(opts.fwdFees);
        }
        else {
            this.fwdFees = new bn_js_1$2.default(0);
        }
        if (opts.createdAt !== null && opts.createdAt !== undefined) {
            this.createdAt = new bn_js_1$2.default(opts.createdAt);
        }
        else {
            this.createdAt = new bn_js_1$2.default(0);
        }
        if (opts.createdLt !== null && opts.createdLt !== undefined) {
            this.createdLt = new bn_js_1$2.default(opts.createdLt);
        }
        else {
            this.createdLt = new bn_js_1$2.default(0);
        }
    }
    writeTo(cell) {
        cell.bits.writeBit(0); // Message id
        cell.bits.writeBit(this.ihrDisabled);
        cell.bits.writeBit(this.bounce);
        cell.bits.writeBit(this.bounced);
        cell.bits.writeAddress(this.from);
        cell.bits.writeAddress(this.to);
        cell.bits.writeCoins(this.value);
        cell.bits.writeBit(false); // Currency collection (not supported)
        cell.bits.writeCoins(this.ihrFees);
        cell.bits.writeCoins(this.fwdFees);
        cell.bits.writeUint(this.createdLt, 64);
        cell.bits.writeUint(this.createdAt, 32);
        this.body.writeTo(cell);
    }
}
InternalMessage$1.InternalMessage = InternalMessage;

var ExternalMessage$1 = {};

Object.defineProperty(ExternalMessage$1, "__esModule", { value: true });
ExternalMessage$1.ExternalMessage = void 0;
class ExternalMessage {
    constructor(opts) {
        this.to = opts.to;
        this.body = opts.body;
        if (opts.from !== undefined && opts.from !== null) {
            this.from = opts.from;
        }
        else {
            this.from = null;
        }
        if (opts.importFee !== undefined && opts.importFee !== null) {
            this.importFee = opts.importFee;
        }
        else {
            this.importFee = 0;
        }
    }
    writeTo(cell) {
        cell.bits.writeUint(2, 2);
        cell.bits.writeAddress(this.from);
        cell.bits.writeAddress(this.to);
        cell.bits.writeCoins(this.importFee);
        this.body.writeTo(cell);
    }
}
ExternalMessage$1.ExternalMessage = ExternalMessage;

var EmptyMessage$1 = {};

Object.defineProperty(EmptyMessage$1, "__esModule", { value: true });
EmptyMessage$1.EmptyMessage = void 0;
class EmptyMessage {
    writeTo(cell) {
        // Nothing to do
    }
}
EmptyMessage$1.EmptyMessage = EmptyMessage;

var StateInit$1 = {};

Object.defineProperty(StateInit$1, "__esModule", { value: true });
StateInit$1.StateInit = void 0;
class StateInit {
    constructor(opts) {
        if (opts.code !== null && opts.code !== undefined) {
            this.code = opts.code;
        }
        else {
            this.code = null;
        }
        if (opts.data !== null && opts.data !== undefined) {
            this.data = opts.data;
        }
        else {
            this.data = null;
        }
    }
    writeTo(cell) {
        cell.bits.writeBit(0); // SplitDepth
        cell.bits.writeBit(0); // TickTock
        cell.bits.writeBit(!!this.code); // Code presence
        cell.bits.writeBit(!!this.data); // Data presence
        cell.bits.writeBit(0); // Library
        if (this.code) {
            cell.refs.push(this.code);
        }
        if (this.data) {
            cell.refs.push(this.data);
        }
    }
}
StateInit$1.StateInit = StateInit;

var CommonMessageInfo$1 = {};

Object.defineProperty(CommonMessageInfo$1, "__esModule", { value: true });
CommonMessageInfo$1.CommonMessageInfo = void 0;
const Cell_1$2 = require$$2$1;
class CommonMessageInfo {
    constructor(opts) {
        if (opts && opts.stateInit !== null && opts.stateInit !== undefined) {
            this.stateInit = opts.stateInit;
        }
        else {
            this.stateInit = null;
        }
        if (opts && opts.body !== null && opts.body !== undefined) {
            this.body = opts.body;
        }
        else {
            this.body = null;
        }
    }
    writeTo(cell) {
        // Write state
        if (this.stateInit) {
            cell.bits.writeBit(1);
            const stateInitCell = new Cell_1$2.Cell();
            this.stateInit.writeTo(stateInitCell);
            //-1:  need at least one bit for body
            if (cell.bits.available - 1 /* At least on byte for body */ >= stateInitCell.bits.cursor) {
                cell.bits.writeBit(0);
                cell.writeCell(stateInitCell);
            }
            else {
                cell.bits.writeBit(1);
                cell.refs.push(stateInitCell);
            }
        }
        else {
            cell.bits.writeBit(0);
        }
        // Write body
        if (this.body) {
            const bodyCell = new Cell_1$2.Cell();
            this.body.writeTo(bodyCell);
            if (cell.bits.available >= bodyCell.bits.cursor) {
                cell.bits.writeBit(0);
                cell.writeCell(bodyCell);
            }
            else {
                cell.bits.writeBit(1);
                cell.refs.push(bodyCell);
            }
        }
        else {
            cell.bits.writeBit(0);
        }
    }
}
CommonMessageInfo$1.CommonMessageInfo = CommonMessageInfo;

Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentMessage = void 0;
const Cell_1$1 = require("../boc/Cell");
class CommentMessage {
    constructor(comment) {
        this.comment = comment;
    }
    writeTo(cell) {
        if (this.comment.length > 0) {
            cell.bits.writeUint(0, 32);
            let bytes = Buffer.from(this.comment);
            let dest = cell;
            while (bytes.length > 0) {
                let avaliable = Math.floor(dest.bits.available / 8);
                if (bytes.length <= avaliable) {
                    dest.bits.writeBuffer(bytes);
                    break;
                }
                dest.bits.writeBuffer(bytes.slice(0, avaliable));
                bytes = bytes.slice(avaliable, bytes.length);
                let nc = new Cell_1$1.Cell();
                dest.refs.push(nc);
                dest = nc;
            }
        }
    }
}
exports.CommentMessage = CommentMessage;

var CommentMessage$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$26 = /*@__PURE__*/getAugmentedNamespace(CommentMessage$1);

var BinaryMessage$1 = {};

Object.defineProperty(BinaryMessage$1, "__esModule", { value: true });
BinaryMessage$1.BinaryMessage = void 0;
class BinaryMessage {
    constructor(payload) {
        this.payload = payload;
    }
    writeTo(cell) {
        cell.bits.writeBuffer(this.payload);
    }
}
BinaryMessage$1.BinaryMessage = BinaryMessage;

var WalletContract = {};

var createWalletTransfer = {};

var dist = {};

var __importDefault$4 = (undefined && undefined.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = exports.sha256_fallback = exports.sha256_sync = void 0;
const jssha_1$2 = __importDefault$4(require("jssha"));
const ton_crypto_primitives_1$2 = require("ton-crypto-primitives");
function sha256_sync(source) {
    let src;
    if (typeof source === 'string') {
        src = Buffer.from(source, 'utf-8').toString('hex');
    }
    else {
        src = source.toString('hex');
    }
    let hasher = new jssha_1$2.default('SHA-256', 'HEX');
    hasher.update(src);
    let res = hasher.getHash('HEX');
    return Buffer.from(res, 'hex');
}
exports.sha256_sync = sha256_sync;
async function sha256_fallback(source) {
    return sha256_sync(source);
}
exports.sha256_fallback = sha256_fallback;
function sha256$2(source) {
    return (0, ton_crypto_primitives_1$2.sha256)(source);
}
exports.sha256 = sha256$2;

var sha256$3 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$0$1 = /*@__PURE__*/getAugmentedNamespace(sha256$3);

var __importDefault$3 = (undefined && undefined.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha512 = exports.sha512_fallback = exports.sha512_sync = void 0;
const jssha_1$1 = __importDefault$3(require("jssha"));
const ton_crypto_primitives_1$1 = require("ton-crypto-primitives");
function sha512_sync(source) {
    let src;
    if (typeof source === 'string') {
        src = Buffer.from(source, 'utf-8').toString('hex');
    }
    else {
        src = source.toString('hex');
    }
    let hasher = new jssha_1$1.default('SHA-512', 'HEX');
    hasher.update(src);
    let res = hasher.getHash('HEX');
    return Buffer.from(res, 'hex');
}
exports.sha512_sync = sha512_sync;
async function sha512_fallback(source) {
    return sha512_sync(source);
}
exports.sha512_fallback = sha512_fallback;
async function sha512$2(source) {
    return (0, ton_crypto_primitives_1$1.sha512)(source);
}
exports.sha512 = sha512$2;

var sha512$3 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$1$2 = /*@__PURE__*/getAugmentedNamespace(sha512$3);

var pbkdf2_sha512$2 = {};

var browser = {};

Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecureRandomWords = exports.getSecureRandomBytes = void 0;
function getSecureRandomBytes(size) {
    return Buffer.from(window.crypto.getRandomValues(new Uint8Array(size)));
}
exports.getSecureRandomBytes = getSecureRandomBytes;
function getSecureRandomWords(size) {
    return window.crypto.getRandomValues(new Uint16Array(size));
}
exports.getSecureRandomWords = getSecureRandomWords;

var getSecureRandom$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$0 = /*@__PURE__*/getAugmentedNamespace(getSecureRandom$1);

Object.defineProperty(exports, "__esModule", { value: true });
exports.hmac_sha512 = void 0;
async function hmac_sha512$2(key, data) {
    let keyBuffer = typeof key === 'string' ? Buffer.from(key, 'utf-8') : key;
    let dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
    const hmacAlgo = { name: "HMAC", hash: "SHA-512" };
    const hmacKey = await window.crypto.subtle.importKey("raw", keyBuffer, hmacAlgo, false, ["sign"]);
    return Buffer.from(await crypto.subtle.sign(hmacAlgo, hmacKey, dataBuffer));
}
exports.hmac_sha512 = hmac_sha512$2;

var hmac_sha512$3 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$1$1 = /*@__PURE__*/getAugmentedNamespace(hmac_sha512$3);

Object.defineProperty(exports, "__esModule", { value: true });
exports.pbkdf2_sha512 = void 0;
async function pbkdf2_sha512(key, salt, iterations, keyLen) {
    const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'utf-8') : key;
    const saltBuffer = typeof salt === 'string' ? Buffer.from(salt, 'utf-8') : salt;
    const pbkdf2_key = await window.crypto.subtle.importKey("raw", keyBuffer, { name: "PBKDF2" }, false, ["deriveBits"]);
    const derivedBits = await window.crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-512", salt: saltBuffer, iterations: iterations }, pbkdf2_key, keyLen * 8);
    return Buffer.from(derivedBits);
}
exports.pbkdf2_sha512 = pbkdf2_sha512;

var pbkdf2_sha512$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$2 = /*@__PURE__*/getAugmentedNamespace(pbkdf2_sha512$1);

Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = void 0;
async function sha256(source) {
    if (typeof source === 'string') {
        return Buffer.from(await crypto.subtle.digest("SHA-256", Buffer.from(source, 'utf-8')));
    }
    return Buffer.from(await crypto.subtle.digest("SHA-256", source));
}
exports.sha256 = sha256;

var sha256$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$3$1 = /*@__PURE__*/getAugmentedNamespace(sha256$1);

Object.defineProperty(exports, "__esModule", { value: true });
exports.sha512 = void 0;
async function sha512(source) {
    if (typeof source === 'string') {
        return Buffer.from(await crypto.subtle.digest("SHA-512", Buffer.from(source, 'utf-8')));
    }
    return Buffer.from(await crypto.subtle.digest("SHA-512", source));
}
exports.sha512 = sha512;

var sha512$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$4 = /*@__PURE__*/getAugmentedNamespace(sha512$1);

var hasRequiredBrowser;

function requireBrowser () {
	if (hasRequiredBrowser) return browser;
	hasRequiredBrowser = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.sha512 = exports.sha256 = exports.pbkdf2_sha512 = exports.hmac_sha512 = exports.getSecureRandomWords = exports.getSecureRandomBytes = void 0;
		var getSecureRandom_1 = require$$0;
		Object.defineProperty(exports, "getSecureRandomBytes", { enumerable: true, get: function () { return getSecureRandom_1.getSecureRandomBytes; } });
		Object.defineProperty(exports, "getSecureRandomWords", { enumerable: true, get: function () { return getSecureRandom_1.getSecureRandomWords; } });
		var hmac_sha512_1 = require$$1$1;
		Object.defineProperty(exports, "hmac_sha512", { enumerable: true, get: function () { return hmac_sha512_1.hmac_sha512; } });
		var pbkdf2_sha512_1 = require$$2;
		Object.defineProperty(exports, "pbkdf2_sha512", { enumerable: true, get: function () { return pbkdf2_sha512_1.pbkdf2_sha512; } });
		var sha256_1 = require$$3$1;
		Object.defineProperty(exports, "sha256", { enumerable: true, get: function () { return sha256_1.sha256; } });
		var sha512_1 = require$$4;
		Object.defineProperty(exports, "sha512", { enumerable: true, get: function () { return sha512_1.sha512; } });
} (browser));
	return browser;
}

var hasRequiredPbkdf2_sha512;

function requirePbkdf2_sha512 () {
	if (hasRequiredPbkdf2_sha512) return pbkdf2_sha512$2;
	hasRequiredPbkdf2_sha512 = 1;
	Object.defineProperty(pbkdf2_sha512$2, "__esModule", { value: true });
	pbkdf2_sha512$2.pbkdf2_sha512 = void 0;
	const ton_crypto_primitives_1 = requireBrowser();
	function pbkdf2_sha512(key, salt, iterations, keyLen) {
	    return (0, ton_crypto_primitives_1.pbkdf2_sha512)(key, salt, iterations, keyLen);
	}
	pbkdf2_sha512$2.pbkdf2_sha512 = pbkdf2_sha512;
	return pbkdf2_sha512$2;
}

var __importDefault$2 = (undefined && undefined.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hmac_sha512 = exports.hmac_sha512_fallback = void 0;
const jssha_1 = __importDefault$2(require("jssha"));
const ton_crypto_primitives_1 = require("ton-crypto-primitives");
async function hmac_sha512_fallback(key, data) {
    let keyBuffer = typeof key === 'string' ? Buffer.from(key, 'utf-8') : key;
    let dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
    const shaObj = new jssha_1.default("SHA-512", "HEX", {
        hmacKey: { value: keyBuffer.toString('hex'), format: "HEX" },
    });
    shaObj.update(dataBuffer.toString('hex'));
    const hmac = shaObj.getHash("HEX");
    return Buffer.from(hmac, 'hex');
}
exports.hmac_sha512_fallback = hmac_sha512_fallback;
function hmac_sha512(key, data) {
    return (0, ton_crypto_primitives_1.hmac_sha512)(key, data);
}
exports.hmac_sha512 = hmac_sha512;

var hmac_sha512$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$3 = /*@__PURE__*/getAugmentedNamespace(hmac_sha512$1);

var getSecureRandom = {};

var hasRequiredGetSecureRandom;

function requireGetSecureRandom () {
	if (hasRequiredGetSecureRandom) return getSecureRandom;
	hasRequiredGetSecureRandom = 1;
	Object.defineProperty(getSecureRandom, "__esModule", { value: true });
	getSecureRandom.getSecureRandomNumber = getSecureRandom.getSecureRandomWords = getSecureRandom.getSecureRandomBytes = void 0;
	const ton_crypto_primitives_1 = requireBrowser();
	async function getSecureRandomBytes(size) {
	    return (0, ton_crypto_primitives_1.getSecureRandomBytes)(size);
	}
	getSecureRandom.getSecureRandomBytes = getSecureRandomBytes;
	async function getSecureRandomWords(size) {
	    return getSecureRandomWords();
	}
	getSecureRandom.getSecureRandomWords = getSecureRandomWords;
	async function getSecureRandomNumber(min, max) {
	    let range = max - min;
	    var bitsNeeded = Math.ceil(Math.log2(range));
	    if (bitsNeeded > 53) {
	        throw new Error('Range is too large');
	    }
	    var bytesNeeded = Math.ceil(bitsNeeded / 8);
	    var mask = Math.pow(2, bitsNeeded) - 1;
	    while (true) {
	        let res = await getSecureRandomBytes(bitsNeeded);
	        let power = (bytesNeeded - 1) * 8;
	        let numberValue = 0;
	        for (var i = 0; i < bytesNeeded; i++) {
	            numberValue += res[i] * Math.pow(2, power);
	            power -= 8;
	        }
	        numberValue = numberValue & mask; // Truncate
	        if (numberValue >= range) {
	            continue;
	        }
	        return min + numberValue;
	    }
	}
	getSecureRandom.getSecureRandomNumber = getSecureRandomNumber;
	return getSecureRandom;
}

var __importDefault$1 = (undefined && undefined.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mnemonicNew = exports.mnemonicValidate = exports.mnemonicToWalletKey = exports.mnemonicToPrivateKey = exports.mnemonicToSeed = exports.mnemonicToEntropy = void 0;
const tweetnacl_1$1 = __importDefault$1(require("tweetnacl"));
const getSecureRandom_1 = require("../primitives/getSecureRandom");
const hmac_sha512_1 = require("../primitives/hmac_sha512");
const pbkdf2_sha512_1 = require("../primitives/pbkdf2_sha512");
const wordlist_1 = require("./wordlist");
const PBKDF_ITERATIONS = 100000;
async function isPasswordNeeded(mnemonicArray) {
    const passlessEntropy = await mnemonicToEntropy(mnemonicArray);
    return (await isPasswordSeed(passlessEntropy)) && !(await isBasicSeed(passlessEntropy));
}
function normalizeMnemonic(src) {
    return src.map((v) => v.toLowerCase().trim());
}
async function isBasicSeed(entropy) {
    // https://github.com/ton-blockchain/ton/blob/24dc184a2ea67f9c47042b4104bbb4d82289fac1/tonlib/tonlib/keys/Mnemonic.cpp#L68
    // bool Mnemonic::is_basic_seed() {
    //   td::SecureString hash(64);
    //   td::pbkdf2_sha512(as_slice(to_entropy()), "TON seed version", td::max(1, PBKDF_ITERATIONS / 256),
    //                     hash.as_mutable_slice());
    //   return hash.as_slice()[0] == 0;
    // }
    const seed = await (0, pbkdf2_sha512_1.pbkdf2_sha512)(entropy, 'TON seed version', Math.max(1, Math.floor(PBKDF_ITERATIONS / 256)), 64);
    return seed[0] == 0;
}
async function isPasswordSeed(entropy) {
    // https://github.com/ton-blockchain/ton/blob/24dc184a2ea67f9c47042b4104bbb4d82289fac1/tonlib/tonlib/keys/Mnemonic.cpp#L75
    // bool Mnemonic::is_password_seed() {
    //   td::SecureString hash(64);
    //   td::pbkdf2_sha512(as_slice(to_entropy()), "TON fast seed version", 1, hash.as_mutable_slice());
    //   return hash.as_slice()[0] == 1;
    // }
    const seed = await (0, pbkdf2_sha512_1.pbkdf2_sha512)(entropy, 'TON fast seed version', 1, 64);
    return seed[0] == 1;
}
async function mnemonicToEntropy(mnemonicArray, password) {
    // https://github.com/ton-blockchain/ton/blob/24dc184a2ea67f9c47042b4104bbb4d82289fac1/tonlib/tonlib/keys/Mnemonic.cpp#L52
    // td::SecureString Mnemonic::to_entropy() const {
    //   td::SecureString res(64);
    //   td::hmac_sha512(join(words_), password_, res.as_mutable_slice());
    //   return res;
    // }
    return await (0, hmac_sha512_1.hmac_sha512)(mnemonicArray.join(' '), password && password.length > 0 ? password : '');
}
exports.mnemonicToEntropy = mnemonicToEntropy;
async function mnemonicToSeed(mnemonicArray, seed, password) {
    // https://github.com/ton-blockchain/ton/blob/24dc184a2ea67f9c47042b4104bbb4d82289fac1/tonlib/tonlib/keys/Mnemonic.cpp#L58
    // td::SecureString Mnemonic::to_seed() const {
    //   td::SecureString hash(64);
    //   td::pbkdf2_sha512(as_slice(to_entropy()), "TON default seed", PBKDF_ITERATIONS, hash.as_mutable_slice());
    //   return hash;
    // }
    const entropy = await mnemonicToEntropy(mnemonicArray, password);
    const res = await (0, pbkdf2_sha512_1.pbkdf2_sha512)(entropy, seed, PBKDF_ITERATIONS, 64);
    return res.slice(0, 32);
}
exports.mnemonicToSeed = mnemonicToSeed;
/**
 * Extract private key from mnemonic
 * @param mnemonicArray mnemonic array
 * @param password mnemonic password
 * @returns Key Pair
 */
async function mnemonicToPrivateKey(mnemonicArray, password) {
    // https://github.com/ton-blockchain/ton/blob/24dc184a2ea67f9c47042b4104bbb4d82289fac1/tonlib/tonlib/keys/Mnemonic.cpp#L64
    // td::Ed25519::PrivateKey Mnemonic::to_private_key() const {
    //   return td::Ed25519::PrivateKey(td::SecureString(as_slice(to_seed()).substr(0, td::Ed25519::PrivateKey::LENGTH)));
    // }
    mnemonicArray = normalizeMnemonic(mnemonicArray);
    const seed = (await mnemonicToSeed(mnemonicArray, 'TON default seed', password));
    let keyPair = tweetnacl_1$1.default.sign.keyPair.fromSeed(seed);
    return {
        publicKey: Buffer.from(keyPair.publicKey),
        secretKey: Buffer.from(keyPair.secretKey)
    };
}
exports.mnemonicToPrivateKey = mnemonicToPrivateKey;
/**
 * Convert mnemonic to wallet key pair
 * @param mnemonicArray mnemonic array
 * @param password mnemonic password
 * @returns Key Pair
 */
async function mnemonicToWalletKey(mnemonicArray, password) {
    let seedPk = await mnemonicToPrivateKey(mnemonicArray, password);
    let seedSecret = seedPk.secretKey.slice(0, 32);
    const keyPair = tweetnacl_1$1.default.sign.keyPair.fromSeed(seedSecret);
    return {
        publicKey: Buffer.from(keyPair.publicKey),
        secretKey: Buffer.from(keyPair.secretKey)
    };
}
exports.mnemonicToWalletKey = mnemonicToWalletKey;
/**
 * Validate Mnemonic
 * @param mnemonicArray mnemonic array
 * @param password mnemonic password
 * @returns true for valid mnemonic
 */
async function mnemonicValidate(mnemonicArray, password) {
    // Normalize
    mnemonicArray = normalizeMnemonic(mnemonicArray);
    // Validate mnemonic words
    for (let word of mnemonicArray) {
        if (wordlist_1.wordlist.indexOf(word) < 0) {
            return false;
        }
    }
    // Check password
    if (password && password.length > 0) {
        if (!await isPasswordNeeded(mnemonicArray)) {
            return false;
        }
    }
    // Validate seed
    return await isBasicSeed(await mnemonicToEntropy(mnemonicArray, password));
}
exports.mnemonicValidate = mnemonicValidate;
/**
 * Generate new Mnemonic
 * @param wordsCount number of words to generate
 * @param password mnemonic password
 * @returns
 */
async function mnemonicNew(wordsCount = 24, password) {
    // https://github.com/ton-blockchain/ton/blob/24dc184a2ea67f9c47042b4104bbb4d82289fac1/tonlib/tonlib/keys/Mnemonic.cpp#L159
    let mnemonicArray = [];
    while (true) {
        // Regenerate new mnemonics
        mnemonicArray = [];
        for (let i = 0; i < wordsCount; i++) {
            let ind = await (0, getSecureRandom_1.getSecureRandomNumber)(0, wordlist_1.wordlist.length);
            mnemonicArray.push(wordlist_1.wordlist[ind]);
        }
        // Chek password conformance
        if (password && password.length > 0) {
            if (!await isPasswordNeeded(mnemonicArray)) {
                continue;
            }
        }
        // Check if basic seed correct
        if (!(await isBasicSeed(await mnemonicToEntropy(mnemonicArray, password)))) {
            continue;
        }
        break;
    }
    return mnemonicArray;
}
exports.mnemonicNew = mnemonicNew;

var mnemonic = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$5 = /*@__PURE__*/getAugmentedNamespace(mnemonic);

var wordlist$1 = {};

var hasRequiredWordlist$1;

function requireWordlist$1 () {
	if (hasRequiredWordlist$1) return wordlist$1;
	hasRequiredWordlist$1 = 1;
	Object.defineProperty(wordlist$1, "__esModule", { value: true });
	wordlist$1.wordlist = void 0;
	const EN = ['abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent', 'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique', 'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch', 'arctic', 'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art', 'artefact', 'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset', 'assist', 'assume', 'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction', 'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake', 'aware', 'away', 'awesome', 'awful', 'awkward', 'axis',
	    'baby', 'bachelor', 'bacon', 'badge', 'bag', 'balance', 'balcony', 'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain', 'barrel', 'base', 'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become', 'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt', 'bench', 'benefit', 'best', 'betray', 'better', 'between', 'beyond', 'bicycle', 'bid', 'bike', 'bind', 'biology', 'bird', 'birth', 'bitter', 'black', 'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless', 'blind', 'blood', 'blossom', 'blouse', 'blue', 'blur', 'blush', 'board', 'boat', 'body', 'boil', 'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring', 'borrow', 'boss', 'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain', 'brand', 'brass', 'brave', 'bread', 'breeze', 'brick', 'bridge', 'brief', 'bright', 'bring', 'brisk', 'broccoli', 'broken', 'bronze', 'broom', 'brother', 'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb', 'bulk', 'bullet', 'bundle', 'bunker', 'burden', 'burger', 'burst', 'bus', 'business', 'busy', 'butter', 'buyer', 'buzz',
	    'cabbage', 'cabin', 'cable', 'cactus', 'cage', 'cake', 'call', 'calm', 'camera', 'camp', 'can', 'canal', 'cancel', 'candy', 'cannon', 'canoe', 'canvas', 'canyon', 'capable', 'capital', 'captain', 'car', 'carbon', 'card', 'cargo', 'carpet', 'carry', 'cart', 'case', 'cash', 'casino', 'castle', 'casual', 'cat', 'catalog', 'catch', 'category', 'cattle', 'caught', 'cause', 'caution', 'cave', 'ceiling', 'celery', 'cement', 'census', 'century', 'cereal', 'certain', 'chair', 'chalk', 'champion', 'change', 'chaos', 'chapter', 'charge', 'chase', 'chat', 'cheap', 'check', 'cheese', 'chef', 'cherry', 'chest', 'chicken', 'chief', 'child', 'chimney', 'choice', 'choose', 'chronic', 'chuckle', 'chunk', 'churn', 'cigar', 'cinnamon', 'circle', 'citizen', 'city', 'civil', 'claim', 'clap', 'clarify', 'claw', 'clay', 'clean', 'clerk', 'clever', 'click', 'client', 'cliff', 'climb', 'clinic', 'clip', 'clock', 'clog', 'close', 'cloth', 'cloud', 'clown', 'club', 'clump', 'cluster', 'clutch', 'coach', 'coast', 'coconut', 'code', 'coffee', 'coil', 'coin', 'collect', 'color', 'column', 'combine', 'come', 'comfort', 'comic', 'common', 'company', 'concert', 'conduct', 'confirm', 'congress', 'connect', 'consider', 'control', 'convince', 'cook', 'cool', 'copper', 'copy', 'coral', 'core', 'corn', 'correct', 'cost', 'cotton', 'couch', 'country', 'couple', 'course', 'cousin', 'cover', 'coyote', 'crack', 'cradle', 'craft', 'cram', 'crane', 'crash', 'crater', 'crawl', 'crazy', 'cream', 'credit', 'creek', 'crew', 'cricket', 'crime', 'crisp', 'critic', 'crop', 'cross', 'crouch', 'crowd', 'crucial', 'cruel', 'cruise', 'crumble', 'crunch', 'crush', 'cry', 'crystal', 'cube', 'culture', 'cup', 'cupboard', 'curious', 'current', 'curtain', 'curve', 'cushion', 'custom', 'cute', 'cycle',
	    'dad', 'damage', 'damp', 'dance', 'danger', 'daring', 'dash', 'daughter', 'dawn', 'day', 'deal', 'debate', 'debris', 'decade', 'december', 'decide', 'decline', 'decorate', 'decrease', 'deer', 'defense', 'define', 'defy', 'degree', 'delay', 'deliver', 'demand', 'demise', 'denial', 'dentist', 'deny', 'depart', 'depend', 'deposit', 'depth', 'deputy', 'derive', 'describe', 'desert', 'design', 'desk', 'despair', 'destroy', 'detail', 'detect', 'develop', 'device', 'devote', 'diagram', 'dial', 'diamond', 'diary', 'dice', 'diesel', 'diet', 'differ', 'digital', 'dignity', 'dilemma', 'dinner', 'dinosaur', 'direct', 'dirt', 'disagree', 'discover', 'disease', 'dish', 'dismiss', 'disorder', 'display', 'distance', 'divert', 'divide', 'divorce', 'dizzy', 'doctor', 'document', 'dog', 'doll', 'dolphin', 'domain', 'donate', 'donkey', 'donor', 'door', 'dose', 'double', 'dove', 'draft', 'dragon', 'drama', 'drastic', 'draw', 'dream', 'dress', 'drift', 'drill', 'drink', 'drip', 'drive', 'drop', 'drum', 'dry', 'duck', 'dumb', 'dune', 'during', 'dust', 'dutch', 'duty', 'dwarf', 'dynamic',
	    'eager', 'eagle', 'early', 'earn', 'earth', 'easily', 'east', 'easy', 'echo', 'ecology', 'economy', 'edge', 'edit', 'educate', 'effort', 'egg', 'eight', 'either', 'elbow', 'elder', 'electric', 'elegant', 'element', 'elephant', 'elevator', 'elite', 'else', 'embark', 'embody', 'embrace', 'emerge', 'emotion', 'employ', 'empower', 'empty', 'enable', 'enact', 'end', 'endless', 'endorse', 'enemy', 'energy', 'enforce', 'engage', 'engine', 'enhance', 'enjoy', 'enlist', 'enough', 'enrich', 'enroll', 'ensure', 'enter', 'entire', 'entry', 'envelope', 'episode', 'equal', 'equip', 'era', 'erase', 'erode', 'erosion', 'error', 'erupt', 'escape', 'essay', 'essence', 'estate', 'eternal', 'ethics', 'evidence', 'evil', 'evoke', 'evolve', 'exact', 'example', 'excess', 'exchange', 'excite', 'exclude', 'excuse', 'execute', 'exercise', 'exhaust', 'exhibit', 'exile', 'exist', 'exit', 'exotic', 'expand', 'expect', 'expire', 'explain', 'expose', 'express', 'extend', 'extra', 'eye', 'eyebrow',
	    'fabric', 'face', 'faculty', 'fade', 'faint', 'faith', 'fall', 'false', 'fame', 'family', 'famous', 'fan', 'fancy', 'fantasy', 'farm', 'fashion', 'fat', 'fatal', 'father', 'fatigue', 'fault', 'favorite', 'feature', 'february', 'federal', 'fee', 'feed', 'feel', 'female', 'fence', 'festival', 'fetch', 'fever', 'few', 'fiber', 'fiction', 'field', 'figure', 'file', 'film', 'filter', 'final', 'find', 'fine', 'finger', 'finish', 'fire', 'firm', 'first', 'fiscal', 'fish', 'fit', 'fitness', 'fix', 'flag', 'flame', 'flash', 'flat', 'flavor', 'flee', 'flight', 'flip', 'float', 'flock', 'floor', 'flower', 'fluid', 'flush', 'fly', 'foam', 'focus', 'fog', 'foil', 'fold', 'follow', 'food', 'foot', 'force', 'forest', 'forget', 'fork', 'fortune', 'forum', 'forward', 'fossil', 'foster', 'found', 'fox', 'fragile', 'frame', 'frequent', 'fresh', 'friend', 'fringe', 'frog', 'front', 'frost', 'frown', 'frozen', 'fruit', 'fuel', 'fun', 'funny', 'furnace', 'fury', 'future',
	    'gadget', 'gain', 'galaxy', 'gallery', 'game', 'gap', 'garage', 'garbage', 'garden', 'garlic', 'garment', 'gas', 'gasp', 'gate', 'gather', 'gauge', 'gaze', 'general', 'genius', 'genre', 'gentle', 'genuine', 'gesture', 'ghost', 'giant', 'gift', 'giggle', 'ginger', 'giraffe', 'girl', 'give', 'glad', 'glance', 'glare', 'glass', 'glide', 'glimpse', 'globe', 'gloom', 'glory', 'glove', 'glow', 'glue', 'goat', 'goddess', 'gold', 'good', 'goose', 'gorilla', 'gospel', 'gossip', 'govern', 'gown', 'grab', 'grace', 'grain', 'grant', 'grape', 'grass', 'gravity', 'great', 'green', 'grid', 'grief', 'grit', 'grocery', 'group', 'grow', 'grunt', 'guard', 'guess', 'guide', 'guilt', 'guitar', 'gun', 'gym',
	    'habit', 'hair', 'half', 'hammer', 'hamster', 'hand', 'happy', 'harbor', 'hard', 'harsh', 'harvest', 'hat', 'have', 'hawk', 'hazard', 'head', 'health', 'heart', 'heavy', 'hedgehog', 'height', 'hello', 'helmet', 'help', 'hen', 'hero', 'hidden', 'high', 'hill', 'hint', 'hip', 'hire', 'history', 'hobby', 'hockey', 'hold', 'hole', 'holiday', 'hollow', 'home', 'honey', 'hood', 'hope', 'horn', 'horror', 'horse', 'hospital', 'host', 'hotel', 'hour', 'hover', 'hub', 'huge', 'human', 'humble', 'humor', 'hundred', 'hungry', 'hunt', 'hurdle', 'hurry', 'hurt', 'husband', 'hybrid',
	    'ice', 'icon', 'idea', 'identify', 'idle', 'ignore', 'ill', 'illegal', 'illness', 'image', 'imitate', 'immense', 'immune', 'impact', 'impose', 'improve', 'impulse', 'inch', 'include', 'income', 'increase', 'index', 'indicate', 'indoor', 'industry', 'infant', 'inflict', 'inform', 'inhale', 'inherit', 'initial', 'inject', 'injury', 'inmate', 'inner', 'innocent', 'input', 'inquiry', 'insane', 'insect', 'inside', 'inspire', 'install', 'intact', 'interest', 'into', 'invest', 'invite', 'involve', 'iron', 'island', 'isolate', 'issue', 'item', 'ivory',
	    'jacket', 'jaguar', 'jar', 'jazz', 'jealous', 'jeans', 'jelly', 'jewel', 'job', 'join', 'joke', 'journey', 'joy', 'judge', 'juice', 'jump', 'jungle', 'junior', 'junk', 'just',
	    'kangaroo', 'keen', 'keep', 'ketchup', 'key', 'kick', 'kid', 'kidney', 'kind', 'kingdom', 'kiss', 'kit', 'kitchen', 'kite', 'kitten', 'kiwi', 'knee', 'knife', 'knock', 'know',
	    'lab', 'label', 'labor', 'ladder', 'lady', 'lake', 'lamp', 'language', 'laptop', 'large', 'later', 'latin', 'laugh', 'laundry', 'lava', 'law', 'lawn', 'lawsuit', 'layer', 'lazy', 'leader', 'leaf', 'learn', 'leave', 'lecture', 'left', 'leg', 'legal', 'legend', 'leisure', 'lemon', 'lend', 'length', 'lens', 'leopard', 'lesson', 'letter', 'level', 'liar', 'liberty', 'library', 'license', 'life', 'lift', 'light', 'like', 'limb', 'limit', 'link', 'lion', 'liquid', 'list', 'little', 'live', 'lizard', 'load', 'loan', 'lobster', 'local', 'lock', 'logic', 'lonely', 'long', 'loop', 'lottery', 'loud', 'lounge', 'love', 'loyal', 'lucky', 'luggage', 'lumber', 'lunar', 'lunch', 'luxury', 'lyrics',
	    'machine', 'mad', 'magic', 'magnet', 'maid', 'mail', 'main', 'major', 'make', 'mammal', 'man', 'manage', 'mandate', 'mango', 'mansion', 'manual', 'maple', 'marble', 'march', 'margin', 'marine', 'market', 'marriage', 'mask', 'mass', 'master', 'match', 'material', 'math', 'matrix', 'matter', 'maximum', 'maze', 'meadow', 'mean', 'measure', 'meat', 'mechanic', 'medal', 'media', 'melody', 'melt', 'member', 'memory', 'mention', 'menu', 'mercy', 'merge', 'merit', 'merry', 'mesh', 'message', 'metal', 'method', 'middle', 'midnight', 'milk', 'million', 'mimic', 'mind', 'minimum', 'minor', 'minute', 'miracle', 'mirror', 'misery', 'miss', 'mistake', 'mix', 'mixed', 'mixture', 'mobile', 'model', 'modify', 'mom', 'moment', 'monitor', 'monkey', 'monster', 'month', 'moon', 'moral', 'more', 'morning', 'mosquito', 'mother', 'motion', 'motor', 'mountain', 'mouse', 'move', 'movie', 'much', 'muffin', 'mule', 'multiply', 'muscle', 'museum', 'mushroom', 'music', 'must', 'mutual', 'myself', 'mystery', 'myth',
	    'naive', 'name', 'napkin', 'narrow', 'nasty', 'nation', 'nature', 'near', 'neck', 'need', 'negative', 'neglect', 'neither', 'nephew', 'nerve', 'nest', 'net', 'network', 'neutral', 'never', 'news', 'next', 'nice', 'night', 'noble', 'noise', 'nominee', 'noodle', 'normal', 'north', 'nose', 'notable', 'note', 'nothing', 'notice', 'novel', 'now', 'nuclear', 'number', 'nurse', 'nut',
	    'oak', 'obey', 'object', 'oblige', 'obscure', 'observe', 'obtain', 'obvious', 'occur', 'ocean', 'october', 'odor', 'off', 'offer', 'office', 'often', 'oil', 'okay', 'old', 'olive', 'olympic', 'omit', 'once', 'one', 'onion', 'online', 'only', 'open', 'opera', 'opinion', 'oppose', 'option', 'orange', 'orbit', 'orchard', 'order', 'ordinary', 'organ', 'orient', 'original', 'orphan', 'ostrich', 'other', 'outdoor', 'outer', 'output', 'outside', 'oval', 'oven', 'over', 'own', 'owner', 'oxygen', 'oyster', 'ozone',
	    'pact', 'paddle', 'page', 'pair', 'palace', 'palm', 'panda', 'panel', 'panic', 'panther', 'paper', 'parade', 'parent', 'park', 'parrot', 'party', 'pass', 'patch', 'path', 'patient', 'patrol', 'pattern', 'pause', 'pave', 'payment', 'peace', 'peanut', 'pear', 'peasant', 'pelican', 'pen', 'penalty', 'pencil', 'people', 'pepper', 'perfect', 'permit', 'person', 'pet', 'phone', 'photo', 'phrase', 'physical', 'piano', 'picnic', 'picture', 'piece', 'pig', 'pigeon', 'pill', 'pilot', 'pink', 'pioneer', 'pipe', 'pistol', 'pitch', 'pizza', 'place', 'planet', 'plastic', 'plate', 'play', 'please', 'pledge', 'pluck', 'plug', 'plunge', 'poem', 'poet', 'point', 'polar', 'pole', 'police', 'pond', 'pony', 'pool', 'popular', 'portion', 'position', 'possible', 'post', 'potato', 'pottery', 'poverty', 'powder', 'power', 'practice', 'praise', 'predict', 'prefer', 'prepare', 'present', 'pretty', 'prevent', 'price', 'pride', 'primary', 'print', 'priority', 'prison', 'private', 'prize', 'problem', 'process', 'produce', 'profit', 'program', 'project', 'promote', 'proof', 'property', 'prosper', 'protect', 'proud', 'provide', 'public', 'pudding', 'pull', 'pulp', 'pulse', 'pumpkin', 'punch', 'pupil', 'puppy', 'purchase', 'purity', 'purpose', 'purse', 'push', 'put', 'puzzle', 'pyramid',
	    'quality', 'quantum', 'quarter', 'question', 'quick', 'quit', 'quiz', 'quote',
	    'rabbit', 'raccoon', 'race', 'rack', 'radar', 'radio', 'rail', 'rain', 'raise', 'rally', 'ramp', 'ranch', 'random', 'range', 'rapid', 'rare', 'rate', 'rather', 'raven', 'raw', 'razor', 'ready', 'real', 'reason', 'rebel', 'rebuild', 'recall', 'receive', 'recipe', 'record', 'recycle', 'reduce', 'reflect', 'reform', 'refuse', 'region', 'regret', 'regular', 'reject', 'relax', 'release', 'relief', 'rely', 'remain', 'remember', 'remind', 'remove', 'render', 'renew', 'rent', 'reopen', 'repair', 'repeat', 'replace', 'report', 'require', 'rescue', 'resemble', 'resist', 'resource', 'response', 'result', 'retire', 'retreat', 'return', 'reunion', 'reveal', 'review', 'reward', 'rhythm', 'rib', 'ribbon', 'rice', 'rich', 'ride', 'ridge', 'rifle', 'right', 'rigid', 'ring', 'riot', 'ripple', 'risk', 'ritual', 'rival', 'river', 'road', 'roast', 'robot', 'robust', 'rocket', 'romance', 'roof', 'rookie', 'room', 'rose', 'rotate', 'rough', 'round', 'route', 'royal', 'rubber', 'rude', 'rug', 'rule', 'run', 'runway', 'rural',
	    'sad', 'saddle', 'sadness', 'safe', 'sail', 'salad', 'salmon', 'salon', 'salt', 'salute', 'same', 'sample', 'sand', 'satisfy', 'satoshi', 'sauce', 'sausage', 'save', 'say', 'scale', 'scan', 'scare', 'scatter', 'scene', 'scheme', 'school', 'science', 'scissors', 'scorpion', 'scout', 'scrap', 'screen', 'script', 'scrub', 'sea', 'search', 'season', 'seat', 'second', 'secret', 'section', 'security', 'seed', 'seek', 'segment', 'select', 'sell', 'seminar', 'senior', 'sense', 'sentence', 'series', 'service', 'session', 'settle', 'setup', 'seven', 'shadow', 'shaft', 'shallow', 'share', 'shed', 'shell', 'sheriff', 'shield', 'shift', 'shine', 'ship', 'shiver', 'shock', 'shoe', 'shoot', 'shop', 'short', 'shoulder', 'shove', 'shrimp', 'shrug', 'shuffle', 'shy', 'sibling', 'sick', 'side', 'siege', 'sight', 'sign', 'silent', 'silk', 'silly', 'silver', 'similar', 'simple', 'since', 'sing', 'siren', 'sister', 'situate', 'six', 'size', 'skate', 'sketch', 'ski', 'skill', 'skin', 'skirt', 'skull', 'slab', 'slam', 'sleep', 'slender', 'slice', 'slide', 'slight', 'slim', 'slogan', 'slot', 'slow', 'slush', 'small', 'smart', 'smile', 'smoke', 'smooth', 'snack', 'snake', 'snap', 'sniff', 'snow', 'soap', 'soccer', 'social', 'sock', 'soda', 'soft', 'solar', 'soldier', 'solid', 'solution', 'solve', 'someone', 'song', 'soon', 'sorry', 'sort', 'soul', 'sound', 'soup', 'source', 'south', 'space', 'spare', 'spatial', 'spawn', 'speak', 'special', 'speed', 'spell', 'spend', 'sphere', 'spice', 'spider', 'spike', 'spin', 'spirit', 'split', 'spoil', 'sponsor', 'spoon', 'sport', 'spot', 'spray', 'spread', 'spring', 'spy', 'square', 'squeeze', 'squirrel', 'stable', 'stadium', 'staff', 'stage', 'stairs', 'stamp', 'stand', 'start', 'state', 'stay', 'steak', 'steel', 'stem', 'step', 'stereo', 'stick', 'still', 'sting', 'stock', 'stomach', 'stone', 'stool', 'story', 'stove', 'strategy', 'street', 'strike', 'strong', 'struggle', 'student', 'stuff', 'stumble', 'style', 'subject', 'submit', 'subway', 'success', 'such', 'sudden', 'suffer', 'sugar', 'suggest', 'suit', 'summer', 'sun', 'sunny', 'sunset', 'super', 'supply', 'supreme', 'sure', 'surface', 'surge', 'surprise', 'surround', 'survey', 'suspect', 'sustain', 'swallow', 'swamp', 'swap', 'swarm', 'swear', 'sweet', 'swift', 'swim', 'swing', 'switch', 'sword', 'symbol', 'symptom', 'syrup', 'system',
	    'table', 'tackle', 'tag', 'tail', 'talent', 'talk', 'tank', 'tape', 'target', 'task', 'taste', 'tattoo', 'taxi', 'teach', 'team', 'tell', 'ten', 'tenant', 'tennis', 'tent', 'term', 'test', 'text', 'thank', 'that', 'theme', 'then', 'theory', 'there', 'they', 'thing', 'this', 'thought', 'three', 'thrive', 'throw', 'thumb', 'thunder', 'ticket', 'tide', 'tiger', 'tilt', 'timber', 'time', 'tiny', 'tip', 'tired', 'tissue', 'title', 'toast', 'tobacco', 'today', 'toddler', 'toe', 'together', 'toilet', 'token', 'tomato', 'tomorrow', 'tone', 'tongue', 'tonight', 'tool', 'tooth', 'top', 'topic', 'topple', 'torch', 'tornado', 'tortoise', 'toss', 'total', 'tourist', 'toward', 'tower', 'town', 'toy', 'track', 'trade', 'traffic', 'tragic', 'train', 'transfer', 'trap', 'trash', 'travel', 'tray', 'treat', 'tree', 'trend', 'trial', 'tribe', 'trick', 'trigger', 'trim', 'trip', 'trophy', 'trouble', 'truck', 'true', 'truly', 'trumpet', 'trust', 'truth', 'try', 'tube', 'tuition', 'tumble', 'tuna', 'tunnel', 'turkey', 'turn', 'turtle', 'twelve', 'twenty', 'twice', 'twin', 'twist', 'two', 'type', 'typical',
	    'ugly', 'umbrella', 'unable', 'unaware', 'uncle', 'uncover', 'under', 'undo', 'unfair', 'unfold', 'unhappy', 'uniform', 'unique', 'unit', 'universe', 'unknown', 'unlock', 'until', 'unusual', 'unveil', 'update', 'upgrade', 'uphold', 'upon', 'upper', 'upset', 'urban', 'urge', 'usage', 'use', 'used', 'useful', 'useless', 'usual', 'utility',
	    'vacant', 'vacuum', 'vague', 'valid', 'valley', 'valve', 'van', 'vanish', 'vapor', 'various', 'vast', 'vault', 'vehicle', 'velvet', 'vendor', 'venture', 'venue', 'verb', 'verify', 'version', 'very', 'vessel', 'veteran', 'viable', 'vibrant', 'vicious', 'victory', 'video', 'view', 'village', 'vintage', 'violin', 'virtual', 'virus', 'visa', 'visit', 'visual', 'vital', 'vivid', 'vocal', 'voice', 'void', 'volcano', 'volume', 'vote', 'voyage',
	    'wage', 'wagon', 'wait', 'walk', 'wall', 'walnut', 'want', 'warfare', 'warm', 'warrior', 'wash', 'wasp', 'waste', 'water', 'wave', 'way', 'wealth', 'weapon', 'wear', 'weasel', 'weather', 'web', 'wedding', 'weekend', 'weird', 'welcome', 'west', 'wet', 'whale', 'what', 'wheat', 'wheel', 'when', 'where', 'whip', 'whisper', 'wide', 'width', 'wife', 'wild', 'will', 'win', 'window', 'wine', 'wing', 'wink', 'winner', 'winter', 'wire', 'wisdom', 'wise', 'wish', 'witness', 'wolf', 'woman', 'wonder', 'wood', 'wool', 'word', 'work', 'world', 'worry', 'worth', 'wrap', 'wreck', 'wrestle', 'wrist', 'write', 'wrong',
	    'yard', 'year', 'yellow', 'you', 'young', 'youth',
	    'zebra', 'zero', 'zone', 'zoo'];
	wordlist$1.wordlist = EN;
	return wordlist$1;
}

var __importDefault = (undefined && undefined.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openBox = exports.sealBox = exports.signVerify = exports.sign = exports.keyPairFromSeed = exports.keyPairFromSecretKey = void 0;
const tweetnacl_1 = __importDefault(require("tweetnacl"));
function keyPairFromSecretKey(secretKey) {
    let res = tweetnacl_1.default.sign.keyPair.fromSecretKey(new Uint8Array(secretKey));
    return {
        publicKey: Buffer.from(res.publicKey),
        secretKey: Buffer.from(res.secretKey),
    };
}
exports.keyPairFromSecretKey = keyPairFromSecretKey;
function keyPairFromSeed(secretKey) {
    let res = tweetnacl_1.default.sign.keyPair.fromSeed(new Uint8Array(secretKey));
    return {
        publicKey: Buffer.from(res.publicKey),
        secretKey: Buffer.from(res.secretKey),
    };
}
exports.keyPairFromSeed = keyPairFromSeed;
function sign(data, secretKey) {
    return Buffer.from(tweetnacl_1.default.sign.detached(new Uint8Array(data), new Uint8Array(secretKey)));
}
exports.sign = sign;
function signVerify(data, signature, publicKey) {
    return tweetnacl_1.default.sign.detached.verify(new Uint8Array(data), new Uint8Array(signature), new Uint8Array(publicKey));
}
exports.signVerify = signVerify;
function sealBox(data, nonce, key) {
    return Buffer.from(tweetnacl_1.default.secretbox(data, nonce, key));
}
exports.sealBox = sealBox;
function openBox(data, nonce, key) {
    let res = tweetnacl_1.default.secretbox.open(data, nonce, key);
    if (!res) {
        return null;
    }
    return Buffer.from(res);
}
exports.openBox = openBox;

var nacl = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$7 = /*@__PURE__*/getAugmentedNamespace(nacl);

var newSecureWords = {};

var wordlist = {};

var hasRequiredWordlist;

function requireWordlist () {
	if (hasRequiredWordlist) return wordlist;
	hasRequiredWordlist = 1;
	Object.defineProperty(wordlist, "__esModule", { value: true });
	wordlist.wordlist = void 0;
	// Source https://www.eff.org/dice
	wordlist.wordlist = [
	    'abacus',
	    'abdomen',
	    'abdominal',
	    'abide',
	    'abiding',
	    'ability',
	    'ablaze',
	    'able',
	    'abnormal',
	    'abrasion',
	    'abrasive',
	    'abreast',
	    'abridge',
	    'abroad',
	    'abruptly',
	    'absence',
	    'absentee',
	    'absently',
	    'absinthe',
	    'absolute',
	    'absolve',
	    'abstain',
	    'abstract',
	    'absurd',
	    'accent',
	    'acclaim',
	    'acclimate',
	    'accompany',
	    'account',
	    'accuracy',
	    'accurate',
	    'accustom',
	    'acetone',
	    'achiness',
	    'aching',
	    'acid',
	    'acorn',
	    'acquaint',
	    'acquire',
	    'acre',
	    'acrobat',
	    'acronym',
	    'acting',
	    'action',
	    'activate',
	    'activator',
	    'active',
	    'activism',
	    'activist',
	    'activity',
	    'actress',
	    'acts',
	    'acutely',
	    'acuteness',
	    'aeration',
	    'aerobics',
	    'aerosol',
	    'aerospace',
	    'afar',
	    'affair',
	    'affected',
	    'affecting',
	    'affection',
	    'affidavit',
	    'affiliate',
	    'affirm',
	    'affix',
	    'afflicted',
	    'affluent',
	    'afford',
	    'affront',
	    'aflame',
	    'afloat',
	    'aflutter',
	    'afoot',
	    'afraid',
	    'afterglow',
	    'afterlife',
	    'aftermath',
	    'aftermost',
	    'afternoon',
	    'aged',
	    'ageless',
	    'agency',
	    'agenda',
	    'agent',
	    'aggregate',
	    'aghast',
	    'agile',
	    'agility',
	    'aging',
	    'agnostic',
	    'agonize',
	    'agonizing',
	    'agony',
	    'agreeable',
	    'agreeably',
	    'agreed',
	    'agreeing',
	    'agreement',
	    'aground',
	    'ahead',
	    'ahoy',
	    'aide',
	    'aids',
	    'aim',
	    'ajar',
	    'alabaster',
	    'alarm',
	    'albatross',
	    'album',
	    'alfalfa',
	    'algebra',
	    'algorithm',
	    'alias',
	    'alibi',
	    'alienable',
	    'alienate',
	    'aliens',
	    'alike',
	    'alive',
	    'alkaline',
	    'alkalize',
	    'almanac',
	    'almighty',
	    'almost',
	    'aloe',
	    'aloft',
	    'aloha',
	    'alone',
	    'alongside',
	    'aloof',
	    'alphabet',
	    'alright',
	    'although',
	    'altitude',
	    'alto',
	    'aluminum',
	    'alumni',
	    'always',
	    'amaretto',
	    'amaze',
	    'amazingly',
	    'amber',
	    'ambiance',
	    'ambiguity',
	    'ambiguous',
	    'ambition',
	    'ambitious',
	    'ambulance',
	    'ambush',
	    'amendable',
	    'amendment',
	    'amends',
	    'amenity',
	    'amiable',
	    'amicably',
	    'amid',
	    'amigo',
	    'amino',
	    'amiss',
	    'ammonia',
	    'ammonium',
	    'amnesty',
	    'amniotic',
	    'among',
	    'amount',
	    'amperage',
	    'ample',
	    'amplifier',
	    'amplify',
	    'amply',
	    'amuck',
	    'amulet',
	    'amusable',
	    'amused',
	    'amusement',
	    'amuser',
	    'amusing',
	    'anaconda',
	    'anaerobic',
	    'anagram',
	    'anatomist',
	    'anatomy',
	    'anchor',
	    'anchovy',
	    'ancient',
	    'android',
	    'anemia',
	    'anemic',
	    'aneurism',
	    'anew',
	    'angelfish',
	    'angelic',
	    'anger',
	    'angled',
	    'angler',
	    'angles',
	    'angling',
	    'angrily',
	    'angriness',
	    'anguished',
	    'angular',
	    'animal',
	    'animate',
	    'animating',
	    'animation',
	    'animator',
	    'anime',
	    'animosity',
	    'ankle',
	    'annex',
	    'annotate',
	    'announcer',
	    'annoying',
	    'annually',
	    'annuity',
	    'anointer',
	    'another',
	    'answering',
	    'antacid',
	    'antarctic',
	    'anteater',
	    'antelope',
	    'antennae',
	    'anthem',
	    'anthill',
	    'anthology',
	    'antibody',
	    'antics',
	    'antidote',
	    'antihero',
	    'antiquely',
	    'antiques',
	    'antiquity',
	    'antirust',
	    'antitoxic',
	    'antitrust',
	    'antiviral',
	    'antivirus',
	    'antler',
	    'antonym',
	    'antsy',
	    'anvil',
	    'anybody',
	    'anyhow',
	    'anymore',
	    'anyone',
	    'anyplace',
	    'anything',
	    'anytime',
	    'anyway',
	    'anywhere',
	    'aorta',
	    'apache',
	    'apostle',
	    'appealing',
	    'appear',
	    'appease',
	    'appeasing',
	    'appendage',
	    'appendix',
	    'appetite',
	    'appetizer',
	    'applaud',
	    'applause',
	    'apple',
	    'appliance',
	    'applicant',
	    'applied',
	    'apply',
	    'appointee',
	    'appraisal',
	    'appraiser',
	    'apprehend',
	    'approach',
	    'approval',
	    'approve',
	    'apricot',
	    'april',
	    'apron',
	    'aptitude',
	    'aptly',
	    'aqua',
	    'aqueduct',
	    'arbitrary',
	    'arbitrate',
	    'ardently',
	    'area',
	    'arena',
	    'arguable',
	    'arguably',
	    'argue',
	    'arise',
	    'armadillo',
	    'armband',
	    'armchair',
	    'armed',
	    'armful',
	    'armhole',
	    'arming',
	    'armless',
	    'armoire',
	    'armored',
	    'armory',
	    'armrest',
	    'army',
	    'aroma',
	    'arose',
	    'around',
	    'arousal',
	    'arrange',
	    'array',
	    'arrest',
	    'arrival',
	    'arrive',
	    'arrogance',
	    'arrogant',
	    'arson',
	    'art',
	    'ascend',
	    'ascension',
	    'ascent',
	    'ascertain',
	    'ashamed',
	    'ashen',
	    'ashes',
	    'ashy',
	    'aside',
	    'askew',
	    'asleep',
	    'asparagus',
	    'aspect',
	    'aspirate',
	    'aspire',
	    'aspirin',
	    'astonish',
	    'astound',
	    'astride',
	    'astrology',
	    'astronaut',
	    'astronomy',
	    'astute',
	    'atlantic',
	    'atlas',
	    'atom',
	    'atonable',
	    'atop',
	    'atrium',
	    'atrocious',
	    'atrophy',
	    'attach',
	    'attain',
	    'attempt',
	    'attendant',
	    'attendee',
	    'attention',
	    'attentive',
	    'attest',
	    'attic',
	    'attire',
	    'attitude',
	    'attractor',
	    'attribute',
	    'atypical',
	    'auction',
	    'audacious',
	    'audacity',
	    'audible',
	    'audibly',
	    'audience',
	    'audio',
	    'audition',
	    'augmented',
	    'august',
	    'authentic',
	    'author',
	    'autism',
	    'autistic',
	    'autograph',
	    'automaker',
	    'automated',
	    'automatic',
	    'autopilot',
	    'available',
	    'avalanche',
	    'avatar',
	    'avenge',
	    'avenging',
	    'avenue',
	    'average',
	    'aversion',
	    'avert',
	    'aviation',
	    'aviator',
	    'avid',
	    'avoid',
	    'await',
	    'awaken',
	    'award',
	    'aware',
	    'awhile',
	    'awkward',
	    'awning',
	    'awoke',
	    'awry',
	    'axis',
	    'babble',
	    'babbling',
	    'babied',
	    'baboon',
	    'backache',
	    'backboard',
	    'backboned',
	    'backdrop',
	    'backed',
	    'backer',
	    'backfield',
	    'backfire',
	    'backhand',
	    'backing',
	    'backlands',
	    'backlash',
	    'backless',
	    'backlight',
	    'backlit',
	    'backlog',
	    'backpack',
	    'backpedal',
	    'backrest',
	    'backroom',
	    'backshift',
	    'backside',
	    'backslid',
	    'backspace',
	    'backspin',
	    'backstab',
	    'backstage',
	    'backtalk',
	    'backtrack',
	    'backup',
	    'backward',
	    'backwash',
	    'backwater',
	    'backyard',
	    'bacon',
	    'bacteria',
	    'bacterium',
	    'badass',
	    'badge',
	    'badland',
	    'badly',
	    'badness',
	    'baffle',
	    'baffling',
	    'bagel',
	    'bagful',
	    'baggage',
	    'bagged',
	    'baggie',
	    'bagginess',
	    'bagging',
	    'baggy',
	    'bagpipe',
	    'baguette',
	    'baked',
	    'bakery',
	    'bakeshop',
	    'baking',
	    'balance',
	    'balancing',
	    'balcony',
	    'balmy',
	    'balsamic',
	    'bamboo',
	    'banana',
	    'banish',
	    'banister',
	    'banjo',
	    'bankable',
	    'bankbook',
	    'banked',
	    'banker',
	    'banking',
	    'banknote',
	    'bankroll',
	    'banner',
	    'bannister',
	    'banshee',
	    'banter',
	    'barbecue',
	    'barbed',
	    'barbell',
	    'barber',
	    'barcode',
	    'barge',
	    'bargraph',
	    'barista',
	    'baritone',
	    'barley',
	    'barmaid',
	    'barman',
	    'barn',
	    'barometer',
	    'barrack',
	    'barracuda',
	    'barrel',
	    'barrette',
	    'barricade',
	    'barrier',
	    'barstool',
	    'bartender',
	    'barterer',
	    'bash',
	    'basically',
	    'basics',
	    'basil',
	    'basin',
	    'basis',
	    'basket',
	    'batboy',
	    'batch',
	    'bath',
	    'baton',
	    'bats',
	    'battalion',
	    'battered',
	    'battering',
	    'battery',
	    'batting',
	    'battle',
	    'bauble',
	    'bazooka',
	    'blabber',
	    'bladder',
	    'blade',
	    'blah',
	    'blame',
	    'blaming',
	    'blanching',
	    'blandness',
	    'blank',
	    'blaspheme',
	    'blasphemy',
	    'blast',
	    'blatancy',
	    'blatantly',
	    'blazer',
	    'blazing',
	    'bleach',
	    'bleak',
	    'bleep',
	    'blemish',
	    'blend',
	    'bless',
	    'blighted',
	    'blimp',
	    'bling',
	    'blinked',
	    'blinker',
	    'blinking',
	    'blinks',
	    'blip',
	    'blissful',
	    'blitz',
	    'blizzard',
	    'bloated',
	    'bloating',
	    'blob',
	    'blog',
	    'bloomers',
	    'blooming',
	    'blooper',
	    'blot',
	    'blouse',
	    'blubber',
	    'bluff',
	    'bluish',
	    'blunderer',
	    'blunt',
	    'blurb',
	    'blurred',
	    'blurry',
	    'blurt',
	    'blush',
	    'blustery',
	    'boaster',
	    'boastful',
	    'boasting',
	    'boat',
	    'bobbed',
	    'bobbing',
	    'bobble',
	    'bobcat',
	    'bobsled',
	    'bobtail',
	    'bodacious',
	    'body',
	    'bogged',
	    'boggle',
	    'bogus',
	    'boil',
	    'bok',
	    'bolster',
	    'bolt',
	    'bonanza',
	    'bonded',
	    'bonding',
	    'bondless',
	    'boned',
	    'bonehead',
	    'boneless',
	    'bonelike',
	    'boney',
	    'bonfire',
	    'bonnet',
	    'bonsai',
	    'bonus',
	    'bony',
	    'boogeyman',
	    'boogieman',
	    'book',
	    'boondocks',
	    'booted',
	    'booth',
	    'bootie',
	    'booting',
	    'bootlace',
	    'bootleg',
	    'boots',
	    'boozy',
	    'borax',
	    'boring',
	    'borough',
	    'borrower',
	    'borrowing',
	    'boss',
	    'botanical',
	    'botanist',
	    'botany',
	    'botch',
	    'both',
	    'bottle',
	    'bottling',
	    'bottom',
	    'bounce',
	    'bouncing',
	    'bouncy',
	    'bounding',
	    'boundless',
	    'bountiful',
	    'bovine',
	    'boxcar',
	    'boxer',
	    'boxing',
	    'boxlike',
	    'boxy',
	    'breach',
	    'breath',
	    'breeches',
	    'breeching',
	    'breeder',
	    'breeding',
	    'breeze',
	    'breezy',
	    'brethren',
	    'brewery',
	    'brewing',
	    'briar',
	    'bribe',
	    'brick',
	    'bride',
	    'bridged',
	    'brigade',
	    'bright',
	    'brilliant',
	    'brim',
	    'bring',
	    'brink',
	    'brisket',
	    'briskly',
	    'briskness',
	    'bristle',
	    'brittle',
	    'broadband',
	    'broadcast',
	    'broaden',
	    'broadly',
	    'broadness',
	    'broadside',
	    'broadways',
	    'broiler',
	    'broiling',
	    'broken',
	    'broker',
	    'bronchial',
	    'bronco',
	    'bronze',
	    'bronzing',
	    'brook',
	    'broom',
	    'brought',
	    'browbeat',
	    'brownnose',
	    'browse',
	    'browsing',
	    'bruising',
	    'brunch',
	    'brunette',
	    'brunt',
	    'brush',
	    'brussels',
	    'brute',
	    'brutishly',
	    'bubble',
	    'bubbling',
	    'bubbly',
	    'buccaneer',
	    'bucked',
	    'bucket',
	    'buckle',
	    'buckshot',
	    'buckskin',
	    'bucktooth',
	    'buckwheat',
	    'buddhism',
	    'buddhist',
	    'budding',
	    'buddy',
	    'budget',
	    'buffalo',
	    'buffed',
	    'buffer',
	    'buffing',
	    'buffoon',
	    'buggy',
	    'bulb',
	    'bulge',
	    'bulginess',
	    'bulgur',
	    'bulk',
	    'bulldog',
	    'bulldozer',
	    'bullfight',
	    'bullfrog',
	    'bullhorn',
	    'bullion',
	    'bullish',
	    'bullpen',
	    'bullring',
	    'bullseye',
	    'bullwhip',
	    'bully',
	    'bunch',
	    'bundle',
	    'bungee',
	    'bunion',
	    'bunkbed',
	    'bunkhouse',
	    'bunkmate',
	    'bunny',
	    'bunt',
	    'busboy',
	    'bush',
	    'busily',
	    'busload',
	    'bust',
	    'busybody',
	    'buzz',
	    'cabana',
	    'cabbage',
	    'cabbie',
	    'cabdriver',
	    'cable',
	    'caboose',
	    'cache',
	    'cackle',
	    'cacti',
	    'cactus',
	    'caddie',
	    'caddy',
	    'cadet',
	    'cadillac',
	    'cadmium',
	    'cage',
	    'cahoots',
	    'cake',
	    'calamari',
	    'calamity',
	    'calcium',
	    'calculate',
	    'calculus',
	    'caliber',
	    'calibrate',
	    'calm',
	    'caloric',
	    'calorie',
	    'calzone',
	    'camcorder',
	    'cameo',
	    'camera',
	    'camisole',
	    'camper',
	    'campfire',
	    'camping',
	    'campsite',
	    'campus',
	    'canal',
	    'canary',
	    'cancel',
	    'candied',
	    'candle',
	    'candy',
	    'cane',
	    'canine',
	    'canister',
	    'cannabis',
	    'canned',
	    'canning',
	    'cannon',
	    'cannot',
	    'canola',
	    'canon',
	    'canopener',
	    'canopy',
	    'canteen',
	    'canyon',
	    'capable',
	    'capably',
	    'capacity',
	    'cape',
	    'capillary',
	    'capital',
	    'capitol',
	    'capped',
	    'capricorn',
	    'capsize',
	    'capsule',
	    'caption',
	    'captivate',
	    'captive',
	    'captivity',
	    'capture',
	    'caramel',
	    'carat',
	    'caravan',
	    'carbon',
	    'cardboard',
	    'carded',
	    'cardiac',
	    'cardigan',
	    'cardinal',
	    'cardstock',
	    'carefully',
	    'caregiver',
	    'careless',
	    'caress',
	    'caretaker',
	    'cargo',
	    'caring',
	    'carless',
	    'carload',
	    'carmaker',
	    'carnage',
	    'carnation',
	    'carnival',
	    'carnivore',
	    'carol',
	    'carpenter',
	    'carpentry',
	    'carpool',
	    'carport',
	    'carried',
	    'carrot',
	    'carrousel',
	    'carry',
	    'cartel',
	    'cartload',
	    'carton',
	    'cartoon',
	    'cartridge',
	    'cartwheel',
	    'carve',
	    'carving',
	    'carwash',
	    'cascade',
	    'case',
	    'cash',
	    'casing',
	    'casino',
	    'casket',
	    'cassette',
	    'casually',
	    'casualty',
	    'catacomb',
	    'catalog',
	    'catalyst',
	    'catalyze',
	    'catapult',
	    'cataract',
	    'catatonic',
	    'catcall',
	    'catchable',
	    'catcher',
	    'catching',
	    'catchy',
	    'caterer',
	    'catering',
	    'catfight',
	    'catfish',
	    'cathedral',
	    'cathouse',
	    'catlike',
	    'catnap',
	    'catnip',
	    'catsup',
	    'cattail',
	    'cattishly',
	    'cattle',
	    'catty',
	    'catwalk',
	    'caucasian',
	    'caucus',
	    'causal',
	    'causation',
	    'cause',
	    'causing',
	    'cauterize',
	    'caution',
	    'cautious',
	    'cavalier',
	    'cavalry',
	    'caviar',
	    'cavity',
	    'cedar',
	    'celery',
	    'celestial',
	    'celibacy',
	    'celibate',
	    'celtic',
	    'cement',
	    'census',
	    'ceramics',
	    'ceremony',
	    'certainly',
	    'certainty',
	    'certified',
	    'certify',
	    'cesarean',
	    'cesspool',
	    'chafe',
	    'chaffing',
	    'chain',
	    'chair',
	    'chalice',
	    'challenge',
	    'chamber',
	    'chamomile',
	    'champion',
	    'chance',
	    'change',
	    'channel',
	    'chant',
	    'chaos',
	    'chaperone',
	    'chaplain',
	    'chapped',
	    'chaps',
	    'chapter',
	    'character',
	    'charbroil',
	    'charcoal',
	    'charger',
	    'charging',
	    'chariot',
	    'charity',
	    'charm',
	    'charred',
	    'charter',
	    'charting',
	    'chase',
	    'chasing',
	    'chaste',
	    'chastise',
	    'chastity',
	    'chatroom',
	    'chatter',
	    'chatting',
	    'chatty',
	    'cheating',
	    'cheddar',
	    'cheek',
	    'cheer',
	    'cheese',
	    'cheesy',
	    'chef',
	    'chemicals',
	    'chemist',
	    'chemo',
	    'cherisher',
	    'cherub',
	    'chess',
	    'chest',
	    'chevron',
	    'chevy',
	    'chewable',
	    'chewer',
	    'chewing',
	    'chewy',
	    'chief',
	    'chihuahua',
	    'childcare',
	    'childhood',
	    'childish',
	    'childless',
	    'childlike',
	    'chili',
	    'chill',
	    'chimp',
	    'chip',
	    'chirping',
	    'chirpy',
	    'chitchat',
	    'chivalry',
	    'chive',
	    'chloride',
	    'chlorine',
	    'choice',
	    'chokehold',
	    'choking',
	    'chomp',
	    'chooser',
	    'choosing',
	    'choosy',
	    'chop',
	    'chosen',
	    'chowder',
	    'chowtime',
	    'chrome',
	    'chubby',
	    'chuck',
	    'chug',
	    'chummy',
	    'chump',
	    'chunk',
	    'churn',
	    'chute',
	    'cider',
	    'cilantro',
	    'cinch',
	    'cinema',
	    'cinnamon',
	    'circle',
	    'circling',
	    'circular',
	    'circulate',
	    'circus',
	    'citable',
	    'citadel',
	    'citation',
	    'citizen',
	    'citric',
	    'citrus',
	    'city',
	    'civic',
	    'civil',
	    'clad',
	    'claim',
	    'clambake',
	    'clammy',
	    'clamor',
	    'clamp',
	    'clamshell',
	    'clang',
	    'clanking',
	    'clapped',
	    'clapper',
	    'clapping',
	    'clarify',
	    'clarinet',
	    'clarity',
	    'clash',
	    'clasp',
	    'class',
	    'clatter',
	    'clause',
	    'clavicle',
	    'claw',
	    'clay',
	    'clean',
	    'clear',
	    'cleat',
	    'cleaver',
	    'cleft',
	    'clench',
	    'clergyman',
	    'clerical',
	    'clerk',
	    'clever',
	    'clicker',
	    'client',
	    'climate',
	    'climatic',
	    'cling',
	    'clinic',
	    'clinking',
	    'clip',
	    'clique',
	    'cloak',
	    'clobber',
	    'clock',
	    'clone',
	    'cloning',
	    'closable',
	    'closure',
	    'clothes',
	    'clothing',
	    'cloud',
	    'clover',
	    'clubbed',
	    'clubbing',
	    'clubhouse',
	    'clump',
	    'clumsily',
	    'clumsy',
	    'clunky',
	    'clustered',
	    'clutch',
	    'clutter',
	    'coach',
	    'coagulant',
	    'coastal',
	    'coaster',
	    'coasting',
	    'coastland',
	    'coastline',
	    'coat',
	    'coauthor',
	    'cobalt',
	    'cobbler',
	    'cobweb',
	    'cocoa',
	    'coconut',
	    'cod',
	    'coeditor',
	    'coerce',
	    'coexist',
	    'coffee',
	    'cofounder',
	    'cognition',
	    'cognitive',
	    'cogwheel',
	    'coherence',
	    'coherent',
	    'cohesive',
	    'coil',
	    'coke',
	    'cola',
	    'cold',
	    'coleslaw',
	    'coliseum',
	    'collage',
	    'collapse',
	    'collar',
	    'collected',
	    'collector',
	    'collide',
	    'collie',
	    'collision',
	    'colonial',
	    'colonist',
	    'colonize',
	    'colony',
	    'colossal',
	    'colt',
	    'coma',
	    'come',
	    'comfort',
	    'comfy',
	    'comic',
	    'coming',
	    'comma',
	    'commence',
	    'commend',
	    'comment',
	    'commerce',
	    'commode',
	    'commodity',
	    'commodore',
	    'common',
	    'commotion',
	    'commute',
	    'commuting',
	    'compacted',
	    'compacter',
	    'compactly',
	    'compactor',
	    'companion',
	    'company',
	    'compare',
	    'compel',
	    'compile',
	    'comply',
	    'component',
	    'composed',
	    'composer',
	    'composite',
	    'compost',
	    'composure',
	    'compound',
	    'compress',
	    'comprised',
	    'computer',
	    'computing',
	    'comrade',
	    'concave',
	    'conceal',
	    'conceded',
	    'concept',
	    'concerned',
	    'concert',
	    'conch',
	    'concierge',
	    'concise',
	    'conclude',
	    'concrete',
	    'concur',
	    'condense',
	    'condiment',
	    'condition',
	    'condone',
	    'conducive',
	    'conductor',
	    'conduit',
	    'cone',
	    'confess',
	    'confetti',
	    'confidant',
	    'confident',
	    'confider',
	    'confiding',
	    'configure',
	    'confined',
	    'confining',
	    'confirm',
	    'conflict',
	    'conform',
	    'confound',
	    'confront',
	    'confused',
	    'confusing',
	    'confusion',
	    'congenial',
	    'congested',
	    'congrats',
	    'congress',
	    'conical',
	    'conjoined',
	    'conjure',
	    'conjuror',
	    'connected',
	    'connector',
	    'consensus',
	    'consent',
	    'console',
	    'consoling',
	    'consonant',
	    'constable',
	    'constant',
	    'constrain',
	    'constrict',
	    'construct',
	    'consult',
	    'consumer',
	    'consuming',
	    'contact',
	    'container',
	    'contempt',
	    'contend',
	    'contented',
	    'contently',
	    'contents',
	    'contest',
	    'context',
	    'contort',
	    'contour',
	    'contrite',
	    'control',
	    'contusion',
	    'convene',
	    'convent',
	    'copartner',
	    'cope',
	    'copied',
	    'copier',
	    'copilot',
	    'coping',
	    'copious',
	    'copper',
	    'copy',
	    'coral',
	    'cork',
	    'cornball',
	    'cornbread',
	    'corncob',
	    'cornea',
	    'corned',
	    'corner',
	    'cornfield',
	    'cornflake',
	    'cornhusk',
	    'cornmeal',
	    'cornstalk',
	    'corny',
	    'coronary',
	    'coroner',
	    'corporal',
	    'corporate',
	    'corral',
	    'correct',
	    'corridor',
	    'corrode',
	    'corroding',
	    'corrosive',
	    'corsage',
	    'corset',
	    'cortex',
	    'cosigner',
	    'cosmetics',
	    'cosmic',
	    'cosmos',
	    'cosponsor',
	    'cost',
	    'cottage',
	    'cotton',
	    'couch',
	    'cough',
	    'could',
	    'countable',
	    'countdown',
	    'counting',
	    'countless',
	    'country',
	    'county',
	    'courier',
	    'covenant',
	    'cover',
	    'coveted',
	    'coveting',
	    'coyness',
	    'cozily',
	    'coziness',
	    'cozy',
	    'crabbing',
	    'crabgrass',
	    'crablike',
	    'crabmeat',
	    'cradle',
	    'cradling',
	    'crafter',
	    'craftily',
	    'craftsman',
	    'craftwork',
	    'crafty',
	    'cramp',
	    'cranberry',
	    'crane',
	    'cranial',
	    'cranium',
	    'crank',
	    'crate',
	    'crave',
	    'craving',
	    'crawfish',
	    'crawlers',
	    'crawling',
	    'crayfish',
	    'crayon',
	    'crazed',
	    'crazily',
	    'craziness',
	    'crazy',
	    'creamed',
	    'creamer',
	    'creamlike',
	    'crease',
	    'creasing',
	    'creatable',
	    'create',
	    'creation',
	    'creative',
	    'creature',
	    'credible',
	    'credibly',
	    'credit',
	    'creed',
	    'creme',
	    'creole',
	    'crepe',
	    'crept',
	    'crescent',
	    'crested',
	    'cresting',
	    'crestless',
	    'crevice',
	    'crewless',
	    'crewman',
	    'crewmate',
	    'crib',
	    'cricket',
	    'cried',
	    'crier',
	    'crimp',
	    'crimson',
	    'cringe',
	    'cringing',
	    'crinkle',
	    'crinkly',
	    'crisped',
	    'crisping',
	    'crisply',
	    'crispness',
	    'crispy',
	    'criteria',
	    'critter',
	    'croak',
	    'crock',
	    'crook',
	    'croon',
	    'crop',
	    'cross',
	    'crouch',
	    'crouton',
	    'crowbar',
	    'crowd',
	    'crown',
	    'crucial',
	    'crudely',
	    'crudeness',
	    'cruelly',
	    'cruelness',
	    'cruelty',
	    'crumb',
	    'crummiest',
	    'crummy',
	    'crumpet',
	    'crumpled',
	    'cruncher',
	    'crunching',
	    'crunchy',
	    'crusader',
	    'crushable',
	    'crushed',
	    'crusher',
	    'crushing',
	    'crust',
	    'crux',
	    'crying',
	    'cryptic',
	    'crystal',
	    'cubbyhole',
	    'cube',
	    'cubical',
	    'cubicle',
	    'cucumber',
	    'cuddle',
	    'cuddly',
	    'cufflink',
	    'culinary',
	    'culminate',
	    'culpable',
	    'culprit',
	    'cultivate',
	    'cultural',
	    'culture',
	    'cupbearer',
	    'cupcake',
	    'cupid',
	    'cupped',
	    'cupping',
	    'curable',
	    'curator',
	    'curdle',
	    'cure',
	    'curfew',
	    'curing',
	    'curled',
	    'curler',
	    'curliness',
	    'curling',
	    'curly',
	    'curry',
	    'curse',
	    'cursive',
	    'cursor',
	    'curtain',
	    'curtly',
	    'curtsy',
	    'curvature',
	    'curve',
	    'curvy',
	    'cushy',
	    'cusp',
	    'cussed',
	    'custard',
	    'custodian',
	    'custody',
	    'customary',
	    'customer',
	    'customize',
	    'customs',
	    'cut',
	    'cycle',
	    'cyclic',
	    'cycling',
	    'cyclist',
	    'cylinder',
	    'cymbal',
	    'cytoplasm',
	    'cytoplast',
	    'dab',
	    'dad',
	    'daffodil',
	    'dagger',
	    'daily',
	    'daintily',
	    'dainty',
	    'dairy',
	    'daisy',
	    'dallying',
	    'dance',
	    'dancing',
	    'dandelion',
	    'dander',
	    'dandruff',
	    'dandy',
	    'danger',
	    'dangle',
	    'dangling',
	    'daredevil',
	    'dares',
	    'daringly',
	    'darkened',
	    'darkening',
	    'darkish',
	    'darkness',
	    'darkroom',
	    'darling',
	    'darn',
	    'dart',
	    'darwinism',
	    'dash',
	    'dastardly',
	    'data',
	    'datebook',
	    'dating',
	    'daughter',
	    'daunting',
	    'dawdler',
	    'dawn',
	    'daybed',
	    'daybreak',
	    'daycare',
	    'daydream',
	    'daylight',
	    'daylong',
	    'dayroom',
	    'daytime',
	    'dazzler',
	    'dazzling',
	    'deacon',
	    'deafening',
	    'deafness',
	    'dealer',
	    'dealing',
	    'dealmaker',
	    'dealt',
	    'dean',
	    'debatable',
	    'debate',
	    'debating',
	    'debit',
	    'debrief',
	    'debtless',
	    'debtor',
	    'debug',
	    'debunk',
	    'decade',
	    'decaf',
	    'decal',
	    'decathlon',
	    'decay',
	    'deceased',
	    'deceit',
	    'deceiver',
	    'deceiving',
	    'december',
	    'decency',
	    'decent',
	    'deception',
	    'deceptive',
	    'decibel',
	    'decidable',
	    'decimal',
	    'decimeter',
	    'decipher',
	    'deck',
	    'declared',
	    'decline',
	    'decode',
	    'decompose',
	    'decorated',
	    'decorator',
	    'decoy',
	    'decrease',
	    'decree',
	    'dedicate',
	    'dedicator',
	    'deduce',
	    'deduct',
	    'deed',
	    'deem',
	    'deepen',
	    'deeply',
	    'deepness',
	    'deface',
	    'defacing',
	    'defame',
	    'default',
	    'defeat',
	    'defection',
	    'defective',
	    'defendant',
	    'defender',
	    'defense',
	    'defensive',
	    'deferral',
	    'deferred',
	    'defiance',
	    'defiant',
	    'defile',
	    'defiling',
	    'define',
	    'definite',
	    'deflate',
	    'deflation',
	    'deflator',
	    'deflected',
	    'deflector',
	    'defog',
	    'deforest',
	    'defraud',
	    'defrost',
	    'deftly',
	    'defuse',
	    'defy',
	    'degraded',
	    'degrading',
	    'degrease',
	    'degree',
	    'dehydrate',
	    'deity',
	    'dejected',
	    'delay',
	    'delegate',
	    'delegator',
	    'delete',
	    'deletion',
	    'delicacy',
	    'delicate',
	    'delicious',
	    'delighted',
	    'delirious',
	    'delirium',
	    'deliverer',
	    'delivery',
	    'delouse',
	    'delta',
	    'deluge',
	    'delusion',
	    'deluxe',
	    'demanding',
	    'demeaning',
	    'demeanor',
	    'demise',
	    'democracy',
	    'democrat',
	    'demote',
	    'demotion',
	    'demystify',
	    'denatured',
	    'deniable',
	    'denial',
	    'denim',
	    'denote',
	    'dense',
	    'density',
	    'dental',
	    'dentist',
	    'denture',
	    'deny',
	    'deodorant',
	    'deodorize',
	    'departed',
	    'departure',
	    'depict',
	    'deplete',
	    'depletion',
	    'deplored',
	    'deploy',
	    'deport',
	    'depose',
	    'depraved',
	    'depravity',
	    'deprecate',
	    'depress',
	    'deprive',
	    'depth',
	    'deputize',
	    'deputy',
	    'derail',
	    'deranged',
	    'derby',
	    'derived',
	    'desecrate',
	    'deserve',
	    'deserving',
	    'designate',
	    'designed',
	    'designer',
	    'designing',
	    'deskbound',
	    'desktop',
	    'deskwork',
	    'desolate',
	    'despair',
	    'despise',
	    'despite',
	    'destiny',
	    'destitute',
	    'destruct',
	    'detached',
	    'detail',
	    'detection',
	    'detective',
	    'detector',
	    'detention',
	    'detergent',
	    'detest',
	    'detonate',
	    'detonator',
	    'detoxify',
	    'detract',
	    'deuce',
	    'devalue',
	    'deviancy',
	    'deviant',
	    'deviate',
	    'deviation',
	    'deviator',
	    'device',
	    'devious',
	    'devotedly',
	    'devotee',
	    'devotion',
	    'devourer',
	    'devouring',
	    'devoutly',
	    'dexterity',
	    'dexterous',
	    'diabetes',
	    'diabetic',
	    'diabolic',
	    'diagnoses',
	    'diagnosis',
	    'diagram',
	    'dial',
	    'diameter',
	    'diaper',
	    'diaphragm',
	    'diary',
	    'dice',
	    'dicing',
	    'dictate',
	    'dictation',
	    'dictator',
	    'difficult',
	    'diffused',
	    'diffuser',
	    'diffusion',
	    'diffusive',
	    'dig',
	    'dilation',
	    'diligence',
	    'diligent',
	    'dill',
	    'dilute',
	    'dime',
	    'diminish',
	    'dimly',
	    'dimmed',
	    'dimmer',
	    'dimness',
	    'dimple',
	    'diner',
	    'dingbat',
	    'dinghy',
	    'dinginess',
	    'dingo',
	    'dingy',
	    'dining',
	    'dinner',
	    'diocese',
	    'dioxide',
	    'diploma',
	    'dipped',
	    'dipper',
	    'dipping',
	    'directed',
	    'direction',
	    'directive',
	    'directly',
	    'directory',
	    'direness',
	    'dirtiness',
	    'disabled',
	    'disagree',
	    'disallow',
	    'disarm',
	    'disarray',
	    'disaster',
	    'disband',
	    'disbelief',
	    'disburse',
	    'discard',
	    'discern',
	    'discharge',
	    'disclose',
	    'discolor',
	    'discount',
	    'discourse',
	    'discover',
	    'discuss',
	    'disdain',
	    'disengage',
	    'disfigure',
	    'disgrace',
	    'dish',
	    'disinfect',
	    'disjoin',
	    'disk',
	    'dislike',
	    'disliking',
	    'dislocate',
	    'dislodge',
	    'disloyal',
	    'dismantle',
	    'dismay',
	    'dismiss',
	    'dismount',
	    'disobey',
	    'disorder',
	    'disown',
	    'disparate',
	    'disparity',
	    'dispatch',
	    'dispense',
	    'dispersal',
	    'dispersed',
	    'disperser',
	    'displace',
	    'display',
	    'displease',
	    'disposal',
	    'dispose',
	    'disprove',
	    'dispute',
	    'disregard',
	    'disrupt',
	    'dissuade',
	    'distance',
	    'distant',
	    'distaste',
	    'distill',
	    'distinct',
	    'distort',
	    'distract',
	    'distress',
	    'district',
	    'distrust',
	    'ditch',
	    'ditto',
	    'ditzy',
	    'dividable',
	    'divided',
	    'dividend',
	    'dividers',
	    'dividing',
	    'divinely',
	    'diving',
	    'divinity',
	    'divisible',
	    'divisibly',
	    'division',
	    'divisive',
	    'divorcee',
	    'dizziness',
	    'dizzy',
	    'doable',
	    'docile',
	    'dock',
	    'doctrine',
	    'document',
	    'dodge',
	    'dodgy',
	    'doily',
	    'doing',
	    'dole',
	    'dollar',
	    'dollhouse',
	    'dollop',
	    'dolly',
	    'dolphin',
	    'domain',
	    'domelike',
	    'domestic',
	    'dominion',
	    'dominoes',
	    'donated',
	    'donation',
	    'donator',
	    'donor',
	    'donut',
	    'doodle',
	    'doorbell',
	    'doorframe',
	    'doorknob',
	    'doorman',
	    'doormat',
	    'doornail',
	    'doorpost',
	    'doorstep',
	    'doorstop',
	    'doorway',
	    'doozy',
	    'dork',
	    'dormitory',
	    'dorsal',
	    'dosage',
	    'dose',
	    'dotted',
	    'doubling',
	    'douche',
	    'dove',
	    'down',
	    'dowry',
	    'doze',
	    'drab',
	    'dragging',
	    'dragonfly',
	    'dragonish',
	    'dragster',
	    'drainable',
	    'drainage',
	    'drained',
	    'drainer',
	    'drainpipe',
	    'dramatic',
	    'dramatize',
	    'drank',
	    'drapery',
	    'drastic',
	    'draw',
	    'dreaded',
	    'dreadful',
	    'dreadlock',
	    'dreamboat',
	    'dreamily',
	    'dreamland',
	    'dreamless',
	    'dreamlike',
	    'dreamt',
	    'dreamy',
	    'drearily',
	    'dreary',
	    'drench',
	    'dress',
	    'drew',
	    'dribble',
	    'dried',
	    'drier',
	    'drift',
	    'driller',
	    'drilling',
	    'drinkable',
	    'drinking',
	    'dripping',
	    'drippy',
	    'drivable',
	    'driven',
	    'driver',
	    'driveway',
	    'driving',
	    'drizzle',
	    'drizzly',
	    'drone',
	    'drool',
	    'droop',
	    'drop-down',
	    'dropbox',
	    'dropkick',
	    'droplet',
	    'dropout',
	    'dropper',
	    'drove',
	    'drown',
	    'drowsily',
	    'drudge',
	    'drum',
	    'dry',
	    'dubbed',
	    'dubiously',
	    'duchess',
	    'duckbill',
	    'ducking',
	    'duckling',
	    'ducktail',
	    'ducky',
	    'duct',
	    'dude',
	    'duffel',
	    'dugout',
	    'duh',
	    'duke',
	    'duller',
	    'dullness',
	    'duly',
	    'dumping',
	    'dumpling',
	    'dumpster',
	    'duo',
	    'dupe',
	    'duplex',
	    'duplicate',
	    'duplicity',
	    'durable',
	    'durably',
	    'duration',
	    'duress',
	    'during',
	    'dusk',
	    'dust',
	    'dutiful',
	    'duty',
	    'duvet',
	    'dwarf',
	    'dweeb',
	    'dwelled',
	    'dweller',
	    'dwelling',
	    'dwindle',
	    'dwindling',
	    'dynamic',
	    'dynamite',
	    'dynasty',
	    'dyslexia',
	    'dyslexic',
	    'each',
	    'eagle',
	    'earache',
	    'eardrum',
	    'earflap',
	    'earful',
	    'earlobe',
	    'early',
	    'earmark',
	    'earmuff',
	    'earphone',
	    'earpiece',
	    'earplugs',
	    'earring',
	    'earshot',
	    'earthen',
	    'earthlike',
	    'earthling',
	    'earthly',
	    'earthworm',
	    'earthy',
	    'earwig',
	    'easeful',
	    'easel',
	    'easiest',
	    'easily',
	    'easiness',
	    'easing',
	    'eastbound',
	    'eastcoast',
	    'easter',
	    'eastward',
	    'eatable',
	    'eaten',
	    'eatery',
	    'eating',
	    'eats',
	    'ebay',
	    'ebony',
	    'ebook',
	    'ecard',
	    'eccentric',
	    'echo',
	    'eclair',
	    'eclipse',
	    'ecologist',
	    'ecology',
	    'economic',
	    'economist',
	    'economy',
	    'ecosphere',
	    'ecosystem',
	    'edge',
	    'edginess',
	    'edging',
	    'edgy',
	    'edition',
	    'editor',
	    'educated',
	    'education',
	    'educator',
	    'eel',
	    'effective',
	    'effects',
	    'efficient',
	    'effort',
	    'eggbeater',
	    'egging',
	    'eggnog',
	    'eggplant',
	    'eggshell',
	    'egomaniac',
	    'egotism',
	    'egotistic',
	    'either',
	    'eject',
	    'elaborate',
	    'elastic',
	    'elated',
	    'elbow',
	    'eldercare',
	    'elderly',
	    'eldest',
	    'electable',
	    'election',
	    'elective',
	    'elephant',
	    'elevate',
	    'elevating',
	    'elevation',
	    'elevator',
	    'eleven',
	    'elf',
	    'eligible',
	    'eligibly',
	    'eliminate',
	    'elite',
	    'elitism',
	    'elixir',
	    'elk',
	    'ellipse',
	    'elliptic',
	    'elm',
	    'elongated',
	    'elope',
	    'eloquence',
	    'eloquent',
	    'elsewhere',
	    'elude',
	    'elusive',
	    'elves',
	    'email',
	    'embargo',
	    'embark',
	    'embassy',
	    'embattled',
	    'embellish',
	    'ember',
	    'embezzle',
	    'emblaze',
	    'emblem',
	    'embody',
	    'embolism',
	    'emboss',
	    'embroider',
	    'emcee',
	    'emerald',
	    'emergency',
	    'emission',
	    'emit',
	    'emote',
	    'emoticon',
	    'emotion',
	    'empathic',
	    'empathy',
	    'emperor',
	    'emphases',
	    'emphasis',
	    'emphasize',
	    'emphatic',
	    'empirical',
	    'employed',
	    'employee',
	    'employer',
	    'emporium',
	    'empower',
	    'emptier',
	    'emptiness',
	    'empty',
	    'emu',
	    'enable',
	    'enactment',
	    'enamel',
	    'enchanted',
	    'enchilada',
	    'encircle',
	    'enclose',
	    'enclosure',
	    'encode',
	    'encore',
	    'encounter',
	    'encourage',
	    'encroach',
	    'encrust',
	    'encrypt',
	    'endanger',
	    'endeared',
	    'endearing',
	    'ended',
	    'ending',
	    'endless',
	    'endnote',
	    'endocrine',
	    'endorphin',
	    'endorse',
	    'endowment',
	    'endpoint',
	    'endurable',
	    'endurance',
	    'enduring',
	    'energetic',
	    'energize',
	    'energy',
	    'enforced',
	    'enforcer',
	    'engaged',
	    'engaging',
	    'engine',
	    'engorge',
	    'engraved',
	    'engraver',
	    'engraving',
	    'engross',
	    'engulf',
	    'enhance',
	    'enigmatic',
	    'enjoyable',
	    'enjoyably',
	    'enjoyer',
	    'enjoying',
	    'enjoyment',
	    'enlarged',
	    'enlarging',
	    'enlighten',
	    'enlisted',
	    'enquirer',
	    'enrage',
	    'enrich',
	    'enroll',
	    'enslave',
	    'ensnare',
	    'ensure',
	    'entail',
	    'entangled',
	    'entering',
	    'entertain',
	    'enticing',
	    'entire',
	    'entitle',
	    'entity',
	    'entomb',
	    'entourage',
	    'entrap',
	    'entree',
	    'entrench',
	    'entrust',
	    'entryway',
	    'entwine',
	    'enunciate',
	    'envelope',
	    'enviable',
	    'enviably',
	    'envious',
	    'envision',
	    'envoy',
	    'envy',
	    'enzyme',
	    'epic',
	    'epidemic',
	    'epidermal',
	    'epidermis',
	    'epidural',
	    'epilepsy',
	    'epileptic',
	    'epilogue',
	    'epiphany',
	    'episode',
	    'equal',
	    'equate',
	    'equation',
	    'equator',
	    'equinox',
	    'equipment',
	    'equity',
	    'equivocal',
	    'eradicate',
	    'erasable',
	    'erased',
	    'eraser',
	    'erasure',
	    'ergonomic',
	    'errand',
	    'errant',
	    'erratic',
	    'error',
	    'erupt',
	    'escalate',
	    'escalator',
	    'escapable',
	    'escapade',
	    'escapist',
	    'escargot',
	    'eskimo',
	    'esophagus',
	    'espionage',
	    'espresso',
	    'esquire',
	    'essay',
	    'essence',
	    'essential',
	    'establish',
	    'estate',
	    'esteemed',
	    'estimate',
	    'estimator',
	    'estranged',
	    'estrogen',
	    'etching',
	    'eternal',
	    'eternity',
	    'ethanol',
	    'ether',
	    'ethically',
	    'ethics',
	    'euphemism',
	    'evacuate',
	    'evacuee',
	    'evade',
	    'evaluate',
	    'evaluator',
	    'evaporate',
	    'evasion',
	    'evasive',
	    'even',
	    'everglade',
	    'evergreen',
	    'everybody',
	    'everyday',
	    'everyone',
	    'evict',
	    'evidence',
	    'evident',
	    'evil',
	    'evoke',
	    'evolution',
	    'evolve',
	    'exact',
	    'exalted',
	    'example',
	    'excavate',
	    'excavator',
	    'exceeding',
	    'exception',
	    'excess',
	    'exchange',
	    'excitable',
	    'exciting',
	    'exclaim',
	    'exclude',
	    'excluding',
	    'exclusion',
	    'exclusive',
	    'excretion',
	    'excretory',
	    'excursion',
	    'excusable',
	    'excusably',
	    'excuse',
	    'exemplary',
	    'exemplify',
	    'exemption',
	    'exerciser',
	    'exert',
	    'exes',
	    'exfoliate',
	    'exhale',
	    'exhaust',
	    'exhume',
	    'exile',
	    'existing',
	    'exit',
	    'exodus',
	    'exonerate',
	    'exorcism',
	    'exorcist',
	    'expand',
	    'expanse',
	    'expansion',
	    'expansive',
	    'expectant',
	    'expedited',
	    'expediter',
	    'expel',
	    'expend',
	    'expenses',
	    'expensive',
	    'expert',
	    'expire',
	    'expiring',
	    'explain',
	    'expletive',
	    'explicit',
	    'explode',
	    'exploit',
	    'explore',
	    'exploring',
	    'exponent',
	    'exporter',
	    'exposable',
	    'expose',
	    'exposure',
	    'express',
	    'expulsion',
	    'exquisite',
	    'extended',
	    'extending',
	    'extent',
	    'extenuate',
	    'exterior',
	    'external',
	    'extinct',
	    'extortion',
	    'extradite',
	    'extras',
	    'extrovert',
	    'extrude',
	    'extruding',
	    'exuberant',
	    'fable',
	    'fabric',
	    'fabulous',
	    'facebook',
	    'facecloth',
	    'facedown',
	    'faceless',
	    'facelift',
	    'faceplate',
	    'faceted',
	    'facial',
	    'facility',
	    'facing',
	    'facsimile',
	    'faction',
	    'factoid',
	    'factor',
	    'factsheet',
	    'factual',
	    'faculty',
	    'fade',
	    'fading',
	    'failing',
	    'falcon',
	    'fall',
	    'false',
	    'falsify',
	    'fame',
	    'familiar',
	    'family',
	    'famine',
	    'famished',
	    'fanatic',
	    'fancied',
	    'fanciness',
	    'fancy',
	    'fanfare',
	    'fang',
	    'fanning',
	    'fantasize',
	    'fantastic',
	    'fantasy',
	    'fascism',
	    'fastball',
	    'faster',
	    'fasting',
	    'fastness',
	    'faucet',
	    'favorable',
	    'favorably',
	    'favored',
	    'favoring',
	    'favorite',
	    'fax',
	    'feast',
	    'federal',
	    'fedora',
	    'feeble',
	    'feed',
	    'feel',
	    'feisty',
	    'feline',
	    'felt-tip',
	    'feminine',
	    'feminism',
	    'feminist',
	    'feminize',
	    'femur',
	    'fence',
	    'fencing',
	    'fender',
	    'ferment',
	    'fernlike',
	    'ferocious',
	    'ferocity',
	    'ferret',
	    'ferris',
	    'ferry',
	    'fervor',
	    'fester',
	    'festival',
	    'festive',
	    'festivity',
	    'fetal',
	    'fetch',
	    'fever',
	    'fiber',
	    'fiction',
	    'fiddle',
	    'fiddling',
	    'fidelity',
	    'fidgeting',
	    'fidgety',
	    'fifteen',
	    'fifth',
	    'fiftieth',
	    'fifty',
	    'figment',
	    'figure',
	    'figurine',
	    'filing',
	    'filled',
	    'filler',
	    'filling',
	    'film',
	    'filter',
	    'filth',
	    'filtrate',
	    'finale',
	    'finalist',
	    'finalize',
	    'finally',
	    'finance',
	    'financial',
	    'finch',
	    'fineness',
	    'finer',
	    'finicky',
	    'finished',
	    'finisher',
	    'finishing',
	    'finite',
	    'finless',
	    'finlike',
	    'fiscally',
	    'fit',
	    'five',
	    'flaccid',
	    'flagman',
	    'flagpole',
	    'flagship',
	    'flagstick',
	    'flagstone',
	    'flail',
	    'flakily',
	    'flaky',
	    'flame',
	    'flammable',
	    'flanked',
	    'flanking',
	    'flannels',
	    'flap',
	    'flaring',
	    'flashback',
	    'flashbulb',
	    'flashcard',
	    'flashily',
	    'flashing',
	    'flashy',
	    'flask',
	    'flatbed',
	    'flatfoot',
	    'flatly',
	    'flatness',
	    'flatten',
	    'flattered',
	    'flatterer',
	    'flattery',
	    'flattop',
	    'flatware',
	    'flatworm',
	    'flavored',
	    'flavorful',
	    'flavoring',
	    'flaxseed',
	    'fled',
	    'fleshed',
	    'fleshy',
	    'flick',
	    'flier',
	    'flight',
	    'flinch',
	    'fling',
	    'flint',
	    'flip',
	    'flirt',
	    'float',
	    'flock',
	    'flogging',
	    'flop',
	    'floral',
	    'florist',
	    'floss',
	    'flounder',
	    'flyable',
	    'flyaway',
	    'flyer',
	    'flying',
	    'flyover',
	    'flypaper',
	    'foam',
	    'foe',
	    'fog',
	    'foil',
	    'folic',
	    'folk',
	    'follicle',
	    'follow',
	    'fondling',
	    'fondly',
	    'fondness',
	    'fondue',
	    'font',
	    'food',
	    'fool',
	    'footage',
	    'football',
	    'footbath',
	    'footboard',
	    'footer',
	    'footgear',
	    'foothill',
	    'foothold',
	    'footing',
	    'footless',
	    'footman',
	    'footnote',
	    'footpad',
	    'footpath',
	    'footprint',
	    'footrest',
	    'footsie',
	    'footsore',
	    'footwear',
	    'footwork',
	    'fossil',
	    'foster',
	    'founder',
	    'founding',
	    'fountain',
	    'fox',
	    'foyer',
	    'fraction',
	    'fracture',
	    'fragile',
	    'fragility',
	    'fragment',
	    'fragrance',
	    'fragrant',
	    'frail',
	    'frame',
	    'framing',
	    'frantic',
	    'fraternal',
	    'frayed',
	    'fraying',
	    'frays',
	    'freckled',
	    'freckles',
	    'freebase',
	    'freebee',
	    'freebie',
	    'freedom',
	    'freefall',
	    'freehand',
	    'freeing',
	    'freeload',
	    'freely',
	    'freemason',
	    'freeness',
	    'freestyle',
	    'freeware',
	    'freeway',
	    'freewill',
	    'freezable',
	    'freezing',
	    'freight',
	    'french',
	    'frenzied',
	    'frenzy',
	    'frequency',
	    'frequent',
	    'fresh',
	    'fretful',
	    'fretted',
	    'friction',
	    'friday',
	    'fridge',
	    'fried',
	    'friend',
	    'frighten',
	    'frightful',
	    'frigidity',
	    'frigidly',
	    'frill',
	    'fringe',
	    'frisbee',
	    'frisk',
	    'fritter',
	    'frivolous',
	    'frolic',
	    'from',
	    'front',
	    'frostbite',
	    'frosted',
	    'frostily',
	    'frosting',
	    'frostlike',
	    'frosty',
	    'froth',
	    'frown',
	    'frozen',
	    'fructose',
	    'frugality',
	    'frugally',
	    'fruit',
	    'frustrate',
	    'frying',
	    'gab',
	    'gaffe',
	    'gag',
	    'gainfully',
	    'gaining',
	    'gains',
	    'gala',
	    'gallantly',
	    'galleria',
	    'gallery',
	    'galley',
	    'gallon',
	    'gallows',
	    'gallstone',
	    'galore',
	    'galvanize',
	    'gambling',
	    'game',
	    'gaming',
	    'gamma',
	    'gander',
	    'gangly',
	    'gangrene',
	    'gangway',
	    'gap',
	    'garage',
	    'garbage',
	    'garden',
	    'gargle',
	    'garland',
	    'garlic',
	    'garment',
	    'garnet',
	    'garnish',
	    'garter',
	    'gas',
	    'gatherer',
	    'gathering',
	    'gating',
	    'gauging',
	    'gauntlet',
	    'gauze',
	    'gave',
	    'gawk',
	    'gazing',
	    'gear',
	    'gecko',
	    'geek',
	    'geiger',
	    'gem',
	    'gender',
	    'generic',
	    'generous',
	    'genetics',
	    'genre',
	    'gentile',
	    'gentleman',
	    'gently',
	    'gents',
	    'geography',
	    'geologic',
	    'geologist',
	    'geology',
	    'geometric',
	    'geometry',
	    'geranium',
	    'gerbil',
	    'geriatric',
	    'germicide',
	    'germinate',
	    'germless',
	    'germproof',
	    'gestate',
	    'gestation',
	    'gesture',
	    'getaway',
	    'getting',
	    'getup',
	    'giant',
	    'gibberish',
	    'giblet',
	    'giddily',
	    'giddiness',
	    'giddy',
	    'gift',
	    'gigabyte',
	    'gigahertz',
	    'gigantic',
	    'giggle',
	    'giggling',
	    'giggly',
	    'gigolo',
	    'gilled',
	    'gills',
	    'gimmick',
	    'girdle',
	    'giveaway',
	    'given',
	    'giver',
	    'giving',
	    'gizmo',
	    'gizzard',
	    'glacial',
	    'glacier',
	    'glade',
	    'gladiator',
	    'gladly',
	    'glamorous',
	    'glamour',
	    'glance',
	    'glancing',
	    'glandular',
	    'glare',
	    'glaring',
	    'glass',
	    'glaucoma',
	    'glazing',
	    'gleaming',
	    'gleeful',
	    'glider',
	    'gliding',
	    'glimmer',
	    'glimpse',
	    'glisten',
	    'glitch',
	    'glitter',
	    'glitzy',
	    'gloater',
	    'gloating',
	    'gloomily',
	    'gloomy',
	    'glorified',
	    'glorifier',
	    'glorify',
	    'glorious',
	    'glory',
	    'gloss',
	    'glove',
	    'glowing',
	    'glowworm',
	    'glucose',
	    'glue',
	    'gluten',
	    'glutinous',
	    'glutton',
	    'gnarly',
	    'gnat',
	    'goal',
	    'goatskin',
	    'goes',
	    'goggles',
	    'going',
	    'goldfish',
	    'goldmine',
	    'goldsmith',
	    'golf',
	    'goliath',
	    'gonad',
	    'gondola',
	    'gone',
	    'gong',
	    'good',
	    'gooey',
	    'goofball',
	    'goofiness',
	    'goofy',
	    'google',
	    'goon',
	    'gopher',
	    'gore',
	    'gorged',
	    'gorgeous',
	    'gory',
	    'gosling',
	    'gossip',
	    'gothic',
	    'gotten',
	    'gout',
	    'gown',
	    'grab',
	    'graceful',
	    'graceless',
	    'gracious',
	    'gradation',
	    'graded',
	    'grader',
	    'gradient',
	    'grading',
	    'gradually',
	    'graduate',
	    'graffiti',
	    'grafted',
	    'grafting',
	    'grain',
	    'granddad',
	    'grandkid',
	    'grandly',
	    'grandma',
	    'grandpa',
	    'grandson',
	    'granite',
	    'granny',
	    'granola',
	    'grant',
	    'granular',
	    'grape',
	    'graph',
	    'grapple',
	    'grappling',
	    'grasp',
	    'grass',
	    'gratified',
	    'gratify',
	    'grating',
	    'gratitude',
	    'gratuity',
	    'gravel',
	    'graveness',
	    'graves',
	    'graveyard',
	    'gravitate',
	    'gravity',
	    'gravy',
	    'gray',
	    'grazing',
	    'greasily',
	    'greedily',
	    'greedless',
	    'greedy',
	    'green',
	    'greeter',
	    'greeting',
	    'grew',
	    'greyhound',
	    'grid',
	    'grief',
	    'grievance',
	    'grieving',
	    'grievous',
	    'grill',
	    'grimace',
	    'grimacing',
	    'grime',
	    'griminess',
	    'grimy',
	    'grinch',
	    'grinning',
	    'grip',
	    'gristle',
	    'grit',
	    'groggily',
	    'groggy',
	    'groin',
	    'groom',
	    'groove',
	    'grooving',
	    'groovy',
	    'grope',
	    'ground',
	    'grouped',
	    'grout',
	    'grove',
	    'grower',
	    'growing',
	    'growl',
	    'grub',
	    'grudge',
	    'grudging',
	    'grueling',
	    'gruffly',
	    'grumble',
	    'grumbling',
	    'grumbly',
	    'grumpily',
	    'grunge',
	    'grunt',
	    'guacamole',
	    'guidable',
	    'guidance',
	    'guide',
	    'guiding',
	    'guileless',
	    'guise',
	    'gulf',
	    'gullible',
	    'gully',
	    'gulp',
	    'gumball',
	    'gumdrop',
	    'gumminess',
	    'gumming',
	    'gummy',
	    'gurgle',
	    'gurgling',
	    'guru',
	    'gush',
	    'gusto',
	    'gusty',
	    'gutless',
	    'guts',
	    'gutter',
	    'guy',
	    'guzzler',
	    'gyration',
	    'habitable',
	    'habitant',
	    'habitat',
	    'habitual',
	    'hacked',
	    'hacker',
	    'hacking',
	    'hacksaw',
	    'had',
	    'haggler',
	    'haiku',
	    'half',
	    'halogen',
	    'halt',
	    'halved',
	    'halves',
	    'hamburger',
	    'hamlet',
	    'hammock',
	    'hamper',
	    'hamster',
	    'hamstring',
	    'handbag',
	    'handball',
	    'handbook',
	    'handbrake',
	    'handcart',
	    'handclap',
	    'handclasp',
	    'handcraft',
	    'handcuff',
	    'handed',
	    'handful',
	    'handgrip',
	    'handgun',
	    'handheld',
	    'handiness',
	    'handiwork',
	    'handlebar',
	    'handled',
	    'handler',
	    'handling',
	    'handmade',
	    'handoff',
	    'handpick',
	    'handprint',
	    'handrail',
	    'handsaw',
	    'handset',
	    'handsfree',
	    'handshake',
	    'handstand',
	    'handwash',
	    'handwork',
	    'handwoven',
	    'handwrite',
	    'handyman',
	    'hangnail',
	    'hangout',
	    'hangover',
	    'hangup',
	    'hankering',
	    'hankie',
	    'hanky',
	    'haphazard',
	    'happening',
	    'happier',
	    'happiest',
	    'happily',
	    'happiness',
	    'happy',
	    'harbor',
	    'hardcopy',
	    'hardcore',
	    'hardcover',
	    'harddisk',
	    'hardened',
	    'hardener',
	    'hardening',
	    'hardhat',
	    'hardhead',
	    'hardiness',
	    'hardly',
	    'hardness',
	    'hardship',
	    'hardware',
	    'hardwired',
	    'hardwood',
	    'hardy',
	    'harmful',
	    'harmless',
	    'harmonica',
	    'harmonics',
	    'harmonize',
	    'harmony',
	    'harness',
	    'harpist',
	    'harsh',
	    'harvest',
	    'hash',
	    'hassle',
	    'haste',
	    'hastily',
	    'hastiness',
	    'hasty',
	    'hatbox',
	    'hatchback',
	    'hatchery',
	    'hatchet',
	    'hatching',
	    'hatchling',
	    'hate',
	    'hatless',
	    'hatred',
	    'haunt',
	    'haven',
	    'hazard',
	    'hazelnut',
	    'hazily',
	    'haziness',
	    'hazing',
	    'hazy',
	    'headache',
	    'headband',
	    'headboard',
	    'headcount',
	    'headdress',
	    'headed',
	    'header',
	    'headfirst',
	    'headgear',
	    'heading',
	    'headlamp',
	    'headless',
	    'headlock',
	    'headphone',
	    'headpiece',
	    'headrest',
	    'headroom',
	    'headscarf',
	    'headset',
	    'headsman',
	    'headstand',
	    'headstone',
	    'headway',
	    'headwear',
	    'heap',
	    'heat',
	    'heave',
	    'heavily',
	    'heaviness',
	    'heaving',
	    'hedge',
	    'hedging',
	    'heftiness',
	    'hefty',
	    'helium',
	    'helmet',
	    'helper',
	    'helpful',
	    'helping',
	    'helpless',
	    'helpline',
	    'hemlock',
	    'hemstitch',
	    'hence',
	    'henchman',
	    'henna',
	    'herald',
	    'herbal',
	    'herbicide',
	    'herbs',
	    'heritage',
	    'hermit',
	    'heroics',
	    'heroism',
	    'herring',
	    'herself',
	    'hertz',
	    'hesitancy',
	    'hesitant',
	    'hesitate',
	    'hexagon',
	    'hexagram',
	    'hubcap',
	    'huddle',
	    'huddling',
	    'huff',
	    'hug',
	    'hula',
	    'hulk',
	    'hull',
	    'human',
	    'humble',
	    'humbling',
	    'humbly',
	    'humid',
	    'humiliate',
	    'humility',
	    'humming',
	    'hummus',
	    'humongous',
	    'humorist',
	    'humorless',
	    'humorous',
	    'humpback',
	    'humped',
	    'humvee',
	    'hunchback',
	    'hundredth',
	    'hunger',
	    'hungrily',
	    'hungry',
	    'hunk',
	    'hunter',
	    'hunting',
	    'huntress',
	    'huntsman',
	    'hurdle',
	    'hurled',
	    'hurler',
	    'hurling',
	    'hurray',
	    'hurricane',
	    'hurried',
	    'hurry',
	    'hurt',
	    'husband',
	    'hush',
	    'husked',
	    'huskiness',
	    'hut',
	    'hybrid',
	    'hydrant',
	    'hydrated',
	    'hydration',
	    'hydrogen',
	    'hydroxide',
	    'hyperlink',
	    'hypertext',
	    'hyphen',
	    'hypnoses',
	    'hypnosis',
	    'hypnotic',
	    'hypnotism',
	    'hypnotist',
	    'hypnotize',
	    'hypocrisy',
	    'hypocrite',
	    'ibuprofen',
	    'ice',
	    'iciness',
	    'icing',
	    'icky',
	    'icon',
	    'icy',
	    'idealism',
	    'idealist',
	    'idealize',
	    'ideally',
	    'idealness',
	    'identical',
	    'identify',
	    'identity',
	    'ideology',
	    'idiocy',
	    'idiom',
	    'idly',
	    'igloo',
	    'ignition',
	    'ignore',
	    'iguana',
	    'illicitly',
	    'illusion',
	    'illusive',
	    'image',
	    'imaginary',
	    'imagines',
	    'imaging',
	    'imbecile',
	    'imitate',
	    'imitation',
	    'immature',
	    'immerse',
	    'immersion',
	    'imminent',
	    'immobile',
	    'immodest',
	    'immorally',
	    'immortal',
	    'immovable',
	    'immovably',
	    'immunity',
	    'immunize',
	    'impaired',
	    'impale',
	    'impart',
	    'impatient',
	    'impeach',
	    'impeding',
	    'impending',
	    'imperfect',
	    'imperial',
	    'impish',
	    'implant',
	    'implement',
	    'implicate',
	    'implicit',
	    'implode',
	    'implosion',
	    'implosive',
	    'imply',
	    'impolite',
	    'important',
	    'importer',
	    'impose',
	    'imposing',
	    'impotence',
	    'impotency',
	    'impotent',
	    'impound',
	    'imprecise',
	    'imprint',
	    'imprison',
	    'impromptu',
	    'improper',
	    'improve',
	    'improving',
	    'improvise',
	    'imprudent',
	    'impulse',
	    'impulsive',
	    'impure',
	    'impurity',
	    'iodine',
	    'iodize',
	    'ion',
	    'ipad',
	    'iphone',
	    'ipod',
	    'irate',
	    'irk',
	    'iron',
	    'irregular',
	    'irrigate',
	    'irritable',
	    'irritably',
	    'irritant',
	    'irritate',
	    'islamic',
	    'islamist',
	    'isolated',
	    'isolating',
	    'isolation',
	    'isotope',
	    'issue',
	    'issuing',
	    'italicize',
	    'italics',
	    'item',
	    'itinerary',
	    'itunes',
	    'ivory',
	    'ivy',
	    'jab',
	    'jackal',
	    'jacket',
	    'jackknife',
	    'jackpot',
	    'jailbird',
	    'jailbreak',
	    'jailer',
	    'jailhouse',
	    'jalapeno',
	    'jam',
	    'janitor',
	    'january',
	    'jargon',
	    'jarring',
	    'jasmine',
	    'jaundice',
	    'jaunt',
	    'java',
	    'jawed',
	    'jawless',
	    'jawline',
	    'jaws',
	    'jaybird',
	    'jaywalker',
	    'jazz',
	    'jeep',
	    'jeeringly',
	    'jellied',
	    'jelly',
	    'jersey',
	    'jester',
	    'jet',
	    'jiffy',
	    'jigsaw',
	    'jimmy',
	    'jingle',
	    'jingling',
	    'jinx',
	    'jitters',
	    'jittery',
	    'job',
	    'jockey',
	    'jockstrap',
	    'jogger',
	    'jogging',
	    'john',
	    'joining',
	    'jokester',
	    'jokingly',
	    'jolliness',
	    'jolly',
	    'jolt',
	    'jot',
	    'jovial',
	    'joyfully',
	    'joylessly',
	    'joyous',
	    'joyride',
	    'joystick',
	    'jubilance',
	    'jubilant',
	    'judge',
	    'judgingly',
	    'judicial',
	    'judiciary',
	    'judo',
	    'juggle',
	    'juggling',
	    'jugular',
	    'juice',
	    'juiciness',
	    'juicy',
	    'jujitsu',
	    'jukebox',
	    'july',
	    'jumble',
	    'jumbo',
	    'jump',
	    'junction',
	    'juncture',
	    'june',
	    'junior',
	    'juniper',
	    'junkie',
	    'junkman',
	    'junkyard',
	    'jurist',
	    'juror',
	    'jury',
	    'justice',
	    'justifier',
	    'justify',
	    'justly',
	    'justness',
	    'juvenile',
	    'kabob',
	    'kangaroo',
	    'karaoke',
	    'karate',
	    'karma',
	    'kebab',
	    'keenly',
	    'keenness',
	    'keep',
	    'keg',
	    'kelp',
	    'kennel',
	    'kept',
	    'kerchief',
	    'kerosene',
	    'kettle',
	    'kick',
	    'kiln',
	    'kilobyte',
	    'kilogram',
	    'kilometer',
	    'kilowatt',
	    'kilt',
	    'kimono',
	    'kindle',
	    'kindling',
	    'kindly',
	    'kindness',
	    'kindred',
	    'kinetic',
	    'kinfolk',
	    'king',
	    'kinship',
	    'kinsman',
	    'kinswoman',
	    'kissable',
	    'kisser',
	    'kissing',
	    'kitchen',
	    'kite',
	    'kitten',
	    'kitty',
	    'kiwi',
	    'kleenex',
	    'knapsack',
	    'knee',
	    'knelt',
	    'knickers',
	    'knoll',
	    'koala',
	    'kooky',
	    'kosher',
	    'krypton',
	    'kudos',
	    'kung',
	    'labored',
	    'laborer',
	    'laboring',
	    'laborious',
	    'labrador',
	    'ladder',
	    'ladies',
	    'ladle',
	    'ladybug',
	    'ladylike',
	    'lagged',
	    'lagging',
	    'lagoon',
	    'lair',
	    'lake',
	    'lance',
	    'landed',
	    'landfall',
	    'landfill',
	    'landing',
	    'landlady',
	    'landless',
	    'landline',
	    'landlord',
	    'landmark',
	    'landmass',
	    'landmine',
	    'landowner',
	    'landscape',
	    'landside',
	    'landslide',
	    'language',
	    'lankiness',
	    'lanky',
	    'lantern',
	    'lapdog',
	    'lapel',
	    'lapped',
	    'lapping',
	    'laptop',
	    'lard',
	    'large',
	    'lark',
	    'lash',
	    'lasso',
	    'last',
	    'latch',
	    'late',
	    'lather',
	    'latitude',
	    'latrine',
	    'latter',
	    'latticed',
	    'launch',
	    'launder',
	    'laundry',
	    'laurel',
	    'lavender',
	    'lavish',
	    'laxative',
	    'lazily',
	    'laziness',
	    'lazy',
	    'lecturer',
	    'left',
	    'legacy',
	    'legal',
	    'legend',
	    'legged',
	    'leggings',
	    'legible',
	    'legibly',
	    'legislate',
	    'lego',
	    'legroom',
	    'legume',
	    'legwarmer',
	    'legwork',
	    'lemon',
	    'lend',
	    'length',
	    'lens',
	    'lent',
	    'leotard',
	    'lesser',
	    'letdown',
	    'lethargic',
	    'lethargy',
	    'letter',
	    'lettuce',
	    'level',
	    'leverage',
	    'levers',
	    'levitate',
	    'levitator',
	    'liability',
	    'liable',
	    'liberty',
	    'librarian',
	    'library',
	    'licking',
	    'licorice',
	    'lid',
	    'life',
	    'lifter',
	    'lifting',
	    'liftoff',
	    'ligament',
	    'likely',
	    'likeness',
	    'likewise',
	    'liking',
	    'lilac',
	    'lilly',
	    'lily',
	    'limb',
	    'limeade',
	    'limelight',
	    'limes',
	    'limit',
	    'limping',
	    'limpness',
	    'line',
	    'lingo',
	    'linguini',
	    'linguist',
	    'lining',
	    'linked',
	    'linoleum',
	    'linseed',
	    'lint',
	    'lion',
	    'lip',
	    'liquefy',
	    'liqueur',
	    'liquid',
	    'lisp',
	    'list',
	    'litigate',
	    'litigator',
	    'litmus',
	    'litter',
	    'little',
	    'livable',
	    'lived',
	    'lively',
	    'liver',
	    'livestock',
	    'lividly',
	    'living',
	    'lizard',
	    'lubricant',
	    'lubricate',
	    'lucid',
	    'luckily',
	    'luckiness',
	    'luckless',
	    'lucrative',
	    'ludicrous',
	    'lugged',
	    'lukewarm',
	    'lullaby',
	    'lumber',
	    'luminance',
	    'luminous',
	    'lumpiness',
	    'lumping',
	    'lumpish',
	    'lunacy',
	    'lunar',
	    'lunchbox',
	    'luncheon',
	    'lunchroom',
	    'lunchtime',
	    'lung',
	    'lurch',
	    'lure',
	    'luridness',
	    'lurk',
	    'lushly',
	    'lushness',
	    'luster',
	    'lustfully',
	    'lustily',
	    'lustiness',
	    'lustrous',
	    'lusty',
	    'luxurious',
	    'luxury',
	    'lying',
	    'lyrically',
	    'lyricism',
	    'lyricist',
	    'lyrics',
	    'macarena',
	    'macaroni',
	    'macaw',
	    'mace',
	    'machine',
	    'machinist',
	    'magazine',
	    'magenta',
	    'maggot',
	    'magical',
	    'magician',
	    'magma',
	    'magnesium',
	    'magnetic',
	    'magnetism',
	    'magnetize',
	    'magnifier',
	    'magnify',
	    'magnitude',
	    'magnolia',
	    'mahogany',
	    'maimed',
	    'majestic',
	    'majesty',
	    'majorette',
	    'majority',
	    'makeover',
	    'maker',
	    'makeshift',
	    'making',
	    'malformed',
	    'malt',
	    'mama',
	    'mammal',
	    'mammary',
	    'mammogram',
	    'manager',
	    'managing',
	    'manatee',
	    'mandarin',
	    'mandate',
	    'mandatory',
	    'mandolin',
	    'manger',
	    'mangle',
	    'mango',
	    'mangy',
	    'manhandle',
	    'manhole',
	    'manhood',
	    'manhunt',
	    'manicotti',
	    'manicure',
	    'manifesto',
	    'manila',
	    'mankind',
	    'manlike',
	    'manliness',
	    'manly',
	    'manmade',
	    'manned',
	    'mannish',
	    'manor',
	    'manpower',
	    'mantis',
	    'mantra',
	    'manual',
	    'many',
	    'map',
	    'marathon',
	    'marauding',
	    'marbled',
	    'marbles',
	    'marbling',
	    'march',
	    'mardi',
	    'margarine',
	    'margarita',
	    'margin',
	    'marigold',
	    'marina',
	    'marine',
	    'marital',
	    'maritime',
	    'marlin',
	    'marmalade',
	    'maroon',
	    'married',
	    'marrow',
	    'marry',
	    'marshland',
	    'marshy',
	    'marsupial',
	    'marvelous',
	    'marxism',
	    'mascot',
	    'masculine',
	    'mashed',
	    'mashing',
	    'massager',
	    'masses',
	    'massive',
	    'mastiff',
	    'matador',
	    'matchbook',
	    'matchbox',
	    'matcher',
	    'matching',
	    'matchless',
	    'material',
	    'maternal',
	    'maternity',
	    'math',
	    'mating',
	    'matriarch',
	    'matrimony',
	    'matrix',
	    'matron',
	    'matted',
	    'matter',
	    'maturely',
	    'maturing',
	    'maturity',
	    'mauve',
	    'maverick',
	    'maximize',
	    'maximum',
	    'maybe',
	    'mayday',
	    'mayflower',
	    'moaner',
	    'moaning',
	    'mobile',
	    'mobility',
	    'mobilize',
	    'mobster',
	    'mocha',
	    'mocker',
	    'mockup',
	    'modified',
	    'modify',
	    'modular',
	    'modulator',
	    'module',
	    'moisten',
	    'moistness',
	    'moisture',
	    'molar',
	    'molasses',
	    'mold',
	    'molecular',
	    'molecule',
	    'molehill',
	    'mollusk',
	    'mom',
	    'monastery',
	    'monday',
	    'monetary',
	    'monetize',
	    'moneybags',
	    'moneyless',
	    'moneywise',
	    'mongoose',
	    'mongrel',
	    'monitor',
	    'monkhood',
	    'monogamy',
	    'monogram',
	    'monologue',
	    'monopoly',
	    'monorail',
	    'monotone',
	    'monotype',
	    'monoxide',
	    'monsieur',
	    'monsoon',
	    'monstrous',
	    'monthly',
	    'monument',
	    'moocher',
	    'moodiness',
	    'moody',
	    'mooing',
	    'moonbeam',
	    'mooned',
	    'moonlight',
	    'moonlike',
	    'moonlit',
	    'moonrise',
	    'moonscape',
	    'moonshine',
	    'moonstone',
	    'moonwalk',
	    'mop',
	    'morale',
	    'morality',
	    'morally',
	    'morbidity',
	    'morbidly',
	    'morphine',
	    'morphing',
	    'morse',
	    'mortality',
	    'mortally',
	    'mortician',
	    'mortified',
	    'mortify',
	    'mortuary',
	    'mosaic',
	    'mossy',
	    'most',
	    'mothball',
	    'mothproof',
	    'motion',
	    'motivate',
	    'motivator',
	    'motive',
	    'motocross',
	    'motor',
	    'motto',
	    'mountable',
	    'mountain',
	    'mounted',
	    'mounting',
	    'mourner',
	    'mournful',
	    'mouse',
	    'mousiness',
	    'moustache',
	    'mousy',
	    'mouth',
	    'movable',
	    'move',
	    'movie',
	    'moving',
	    'mower',
	    'mowing',
	    'much',
	    'muck',
	    'mud',
	    'mug',
	    'mulberry',
	    'mulch',
	    'mule',
	    'mulled',
	    'mullets',
	    'multiple',
	    'multiply',
	    'multitask',
	    'multitude',
	    'mumble',
	    'mumbling',
	    'mumbo',
	    'mummified',
	    'mummify',
	    'mummy',
	    'mumps',
	    'munchkin',
	    'mundane',
	    'municipal',
	    'muppet',
	    'mural',
	    'murkiness',
	    'murky',
	    'murmuring',
	    'muscular',
	    'museum',
	    'mushily',
	    'mushiness',
	    'mushroom',
	    'mushy',
	    'music',
	    'musket',
	    'muskiness',
	    'musky',
	    'mustang',
	    'mustard',
	    'muster',
	    'mustiness',
	    'musty',
	    'mutable',
	    'mutate',
	    'mutation',
	    'mute',
	    'mutilated',
	    'mutilator',
	    'mutiny',
	    'mutt',
	    'mutual',
	    'muzzle',
	    'myself',
	    'myspace',
	    'mystified',
	    'mystify',
	    'myth',
	    'nacho',
	    'nag',
	    'nail',
	    'name',
	    'naming',
	    'nanny',
	    'nanometer',
	    'nape',
	    'napkin',
	    'napped',
	    'napping',
	    'nappy',
	    'narrow',
	    'nastily',
	    'nastiness',
	    'national',
	    'native',
	    'nativity',
	    'natural',
	    'nature',
	    'naturist',
	    'nautical',
	    'navigate',
	    'navigator',
	    'navy',
	    'nearby',
	    'nearest',
	    'nearly',
	    'nearness',
	    'neatly',
	    'neatness',
	    'nebula',
	    'nebulizer',
	    'nectar',
	    'negate',
	    'negation',
	    'negative',
	    'neglector',
	    'negligee',
	    'negligent',
	    'negotiate',
	    'nemeses',
	    'nemesis',
	    'neon',
	    'nephew',
	    'nerd',
	    'nervous',
	    'nervy',
	    'nest',
	    'net',
	    'neurology',
	    'neuron',
	    'neurosis',
	    'neurotic',
	    'neuter',
	    'neutron',
	    'never',
	    'next',
	    'nibble',
	    'nickname',
	    'nicotine',
	    'niece',
	    'nifty',
	    'nimble',
	    'nimbly',
	    'nineteen',
	    'ninetieth',
	    'ninja',
	    'nintendo',
	    'ninth',
	    'nuclear',
	    'nuclei',
	    'nucleus',
	    'nugget',
	    'nullify',
	    'number',
	    'numbing',
	    'numbly',
	    'numbness',
	    'numeral',
	    'numerate',
	    'numerator',
	    'numeric',
	    'numerous',
	    'nuptials',
	    'nursery',
	    'nursing',
	    'nurture',
	    'nutcase',
	    'nutlike',
	    'nutmeg',
	    'nutrient',
	    'nutshell',
	    'nuttiness',
	    'nutty',
	    'nuzzle',
	    'nylon',
	    'oaf',
	    'oak',
	    'oasis',
	    'oat',
	    'obedience',
	    'obedient',
	    'obituary',
	    'object',
	    'obligate',
	    'obliged',
	    'oblivion',
	    'oblivious',
	    'oblong',
	    'obnoxious',
	    'oboe',
	    'obscure',
	    'obscurity',
	    'observant',
	    'observer',
	    'observing',
	    'obsessed',
	    'obsession',
	    'obsessive',
	    'obsolete',
	    'obstacle',
	    'obstinate',
	    'obstruct',
	    'obtain',
	    'obtrusive',
	    'obtuse',
	    'obvious',
	    'occultist',
	    'occupancy',
	    'occupant',
	    'occupier',
	    'occupy',
	    'ocean',
	    'ocelot',
	    'octagon',
	    'octane',
	    'october',
	    'octopus',
	    'ogle',
	    'oil',
	    'oink',
	    'ointment',
	    'okay',
	    'old',
	    'olive',
	    'olympics',
	    'omega',
	    'omen',
	    'ominous',
	    'omission',
	    'omit',
	    'omnivore',
	    'onboard',
	    'oncoming',
	    'ongoing',
	    'onion',
	    'online',
	    'onlooker',
	    'only',
	    'onscreen',
	    'onset',
	    'onshore',
	    'onslaught',
	    'onstage',
	    'onto',
	    'onward',
	    'onyx',
	    'oops',
	    'ooze',
	    'oozy',
	    'opacity',
	    'opal',
	    'open',
	    'operable',
	    'operate',
	    'operating',
	    'operation',
	    'operative',
	    'operator',
	    'opium',
	    'opossum',
	    'opponent',
	    'oppose',
	    'opposing',
	    'opposite',
	    'oppressed',
	    'oppressor',
	    'opt',
	    'opulently',
	    'osmosis',
	    'other',
	    'otter',
	    'ouch',
	    'ought',
	    'ounce',
	    'outage',
	    'outback',
	    'outbid',
	    'outboard',
	    'outbound',
	    'outbreak',
	    'outburst',
	    'outcast',
	    'outclass',
	    'outcome',
	    'outdated',
	    'outdoors',
	    'outer',
	    'outfield',
	    'outfit',
	    'outflank',
	    'outgoing',
	    'outgrow',
	    'outhouse',
	    'outing',
	    'outlast',
	    'outlet',
	    'outline',
	    'outlook',
	    'outlying',
	    'outmatch',
	    'outmost',
	    'outnumber',
	    'outplayed',
	    'outpost',
	    'outpour',
	    'output',
	    'outrage',
	    'outrank',
	    'outreach',
	    'outright',
	    'outscore',
	    'outsell',
	    'outshine',
	    'outshoot',
	    'outsider',
	    'outskirts',
	    'outsmart',
	    'outsource',
	    'outspoken',
	    'outtakes',
	    'outthink',
	    'outward',
	    'outweigh',
	    'outwit',
	    'oval',
	    'ovary',
	    'oven',
	    'overact',
	    'overall',
	    'overarch',
	    'overbid',
	    'overbill',
	    'overbite',
	    'overblown',
	    'overboard',
	    'overbook',
	    'overbuilt',
	    'overcast',
	    'overcoat',
	    'overcome',
	    'overcook',
	    'overcrowd',
	    'overdraft',
	    'overdrawn',
	    'overdress',
	    'overdrive',
	    'overdue',
	    'overeager',
	    'overeater',
	    'overexert',
	    'overfed',
	    'overfeed',
	    'overfill',
	    'overflow',
	    'overfull',
	    'overgrown',
	    'overhand',
	    'overhang',
	    'overhaul',
	    'overhead',
	    'overhear',
	    'overheat',
	    'overhung',
	    'overjoyed',
	    'overkill',
	    'overlabor',
	    'overlaid',
	    'overlap',
	    'overlay',
	    'overload',
	    'overlook',
	    'overlord',
	    'overlying',
	    'overnight',
	    'overpass',
	    'overpay',
	    'overplant',
	    'overplay',
	    'overpower',
	    'overprice',
	    'overrate',
	    'overreach',
	    'overreact',
	    'override',
	    'overripe',
	    'overrule',
	    'overrun',
	    'overshoot',
	    'overshot',
	    'oversight',
	    'oversized',
	    'oversleep',
	    'oversold',
	    'overspend',
	    'overstate',
	    'overstay',
	    'overstep',
	    'overstock',
	    'overstuff',
	    'oversweet',
	    'overtake',
	    'overthrow',
	    'overtime',
	    'overtly',
	    'overtone',
	    'overture',
	    'overturn',
	    'overuse',
	    'overvalue',
	    'overview',
	    'overwrite',
	    'owl',
	    'oxford',
	    'oxidant',
	    'oxidation',
	    'oxidize',
	    'oxidizing',
	    'oxygen',
	    'oxymoron',
	    'oyster',
	    'ozone',
	    'paced',
	    'pacemaker',
	    'pacific',
	    'pacifier',
	    'pacifism',
	    'pacifist',
	    'pacify',
	    'padded',
	    'padding',
	    'paddle',
	    'paddling',
	    'padlock',
	    'pagan',
	    'pager',
	    'paging',
	    'pajamas',
	    'palace',
	    'palatable',
	    'palm',
	    'palpable',
	    'palpitate',
	    'paltry',
	    'pampered',
	    'pamperer',
	    'pampers',
	    'pamphlet',
	    'panama',
	    'pancake',
	    'pancreas',
	    'panda',
	    'pandemic',
	    'pang',
	    'panhandle',
	    'panic',
	    'panning',
	    'panorama',
	    'panoramic',
	    'panther',
	    'pantomime',
	    'pantry',
	    'pants',
	    'pantyhose',
	    'paparazzi',
	    'papaya',
	    'paper',
	    'paprika',
	    'papyrus',
	    'parabola',
	    'parachute',
	    'parade',
	    'paradox',
	    'paragraph',
	    'parakeet',
	    'paralegal',
	    'paralyses',
	    'paralysis',
	    'paralyze',
	    'paramedic',
	    'parameter',
	    'paramount',
	    'parasail',
	    'parasite',
	    'parasitic',
	    'parcel',
	    'parched',
	    'parchment',
	    'pardon',
	    'parish',
	    'parka',
	    'parking',
	    'parkway',
	    'parlor',
	    'parmesan',
	    'parole',
	    'parrot',
	    'parsley',
	    'parsnip',
	    'partake',
	    'parted',
	    'parting',
	    'partition',
	    'partly',
	    'partner',
	    'partridge',
	    'party',
	    'passable',
	    'passably',
	    'passage',
	    'passcode',
	    'passenger',
	    'passerby',
	    'passing',
	    'passion',
	    'passive',
	    'passivism',
	    'passover',
	    'passport',
	    'password',
	    'pasta',
	    'pasted',
	    'pastel',
	    'pastime',
	    'pastor',
	    'pastrami',
	    'pasture',
	    'pasty',
	    'patchwork',
	    'patchy',
	    'paternal',
	    'paternity',
	    'path',
	    'patience',
	    'patient',
	    'patio',
	    'patriarch',
	    'patriot',
	    'patrol',
	    'patronage',
	    'patronize',
	    'pauper',
	    'pavement',
	    'paver',
	    'pavestone',
	    'pavilion',
	    'paving',
	    'pawing',
	    'payable',
	    'payback',
	    'paycheck',
	    'payday',
	    'payee',
	    'payer',
	    'paying',
	    'payment',
	    'payphone',
	    'payroll',
	    'pebble',
	    'pebbly',
	    'pecan',
	    'pectin',
	    'peculiar',
	    'peddling',
	    'pediatric',
	    'pedicure',
	    'pedigree',
	    'pedometer',
	    'pegboard',
	    'pelican',
	    'pellet',
	    'pelt',
	    'pelvis',
	    'penalize',
	    'penalty',
	    'pencil',
	    'pendant',
	    'pending',
	    'penholder',
	    'penknife',
	    'pennant',
	    'penniless',
	    'penny',
	    'penpal',
	    'pension',
	    'pentagon',
	    'pentagram',
	    'pep',
	    'perceive',
	    'percent',
	    'perch',
	    'percolate',
	    'perennial',
	    'perfected',
	    'perfectly',
	    'perfume',
	    'periscope',
	    'perish',
	    'perjurer',
	    'perjury',
	    'perkiness',
	    'perky',
	    'perm',
	    'peroxide',
	    'perpetual',
	    'perplexed',
	    'persecute',
	    'persevere',
	    'persuaded',
	    'persuader',
	    'pesky',
	    'peso',
	    'pessimism',
	    'pessimist',
	    'pester',
	    'pesticide',
	    'petal',
	    'petite',
	    'petition',
	    'petri',
	    'petroleum',
	    'petted',
	    'petticoat',
	    'pettiness',
	    'petty',
	    'petunia',
	    'phantom',
	    'phobia',
	    'phoenix',
	    'phonebook',
	    'phoney',
	    'phonics',
	    'phoniness',
	    'phony',
	    'phosphate',
	    'photo',
	    'phrase',
	    'phrasing',
	    'placard',
	    'placate',
	    'placidly',
	    'plank',
	    'planner',
	    'plant',
	    'plasma',
	    'plaster',
	    'plastic',
	    'plated',
	    'platform',
	    'plating',
	    'platinum',
	    'platonic',
	    'platter',
	    'platypus',
	    'plausible',
	    'plausibly',
	    'playable',
	    'playback',
	    'player',
	    'playful',
	    'playgroup',
	    'playhouse',
	    'playing',
	    'playlist',
	    'playmaker',
	    'playmate',
	    'playoff',
	    'playpen',
	    'playroom',
	    'playset',
	    'plaything',
	    'playtime',
	    'plaza',
	    'pleading',
	    'pleat',
	    'pledge',
	    'plentiful',
	    'plenty',
	    'plethora',
	    'plexiglas',
	    'pliable',
	    'plod',
	    'plop',
	    'plot',
	    'plow',
	    'ploy',
	    'pluck',
	    'plug',
	    'plunder',
	    'plunging',
	    'plural',
	    'plus',
	    'plutonium',
	    'plywood',
	    'poach',
	    'pod',
	    'poem',
	    'poet',
	    'pogo',
	    'pointed',
	    'pointer',
	    'pointing',
	    'pointless',
	    'pointy',
	    'poise',
	    'poison',
	    'poker',
	    'poking',
	    'polar',
	    'police',
	    'policy',
	    'polio',
	    'polish',
	    'politely',
	    'polka',
	    'polo',
	    'polyester',
	    'polygon',
	    'polygraph',
	    'polymer',
	    'poncho',
	    'pond',
	    'pony',
	    'popcorn',
	    'pope',
	    'poplar',
	    'popper',
	    'poppy',
	    'popsicle',
	    'populace',
	    'popular',
	    'populate',
	    'porcupine',
	    'pork',
	    'porous',
	    'porridge',
	    'portable',
	    'portal',
	    'portfolio',
	    'porthole',
	    'portion',
	    'portly',
	    'portside',
	    'poser',
	    'posh',
	    'posing',
	    'possible',
	    'possibly',
	    'possum',
	    'postage',
	    'postal',
	    'postbox',
	    'postcard',
	    'posted',
	    'poster',
	    'posting',
	    'postnasal',
	    'posture',
	    'postwar',
	    'pouch',
	    'pounce',
	    'pouncing',
	    'pound',
	    'pouring',
	    'pout',
	    'powdered',
	    'powdering',
	    'powdery',
	    'power',
	    'powwow',
	    'pox',
	    'praising',
	    'prance',
	    'prancing',
	    'pranker',
	    'prankish',
	    'prankster',
	    'prayer',
	    'praying',
	    'preacher',
	    'preaching',
	    'preachy',
	    'preamble',
	    'precinct',
	    'precise',
	    'precision',
	    'precook',
	    'precut',
	    'predator',
	    'predefine',
	    'predict',
	    'preface',
	    'prefix',
	    'preflight',
	    'preformed',
	    'pregame',
	    'pregnancy',
	    'pregnant',
	    'preheated',
	    'prelaunch',
	    'prelaw',
	    'prelude',
	    'premiere',
	    'premises',
	    'premium',
	    'prenatal',
	    'preoccupy',
	    'preorder',
	    'prepaid',
	    'prepay',
	    'preplan',
	    'preppy',
	    'preschool',
	    'prescribe',
	    'preseason',
	    'preset',
	    'preshow',
	    'president',
	    'presoak',
	    'press',
	    'presume',
	    'presuming',
	    'preteen',
	    'pretended',
	    'pretender',
	    'pretense',
	    'pretext',
	    'pretty',
	    'pretzel',
	    'prevail',
	    'prevalent',
	    'prevent',
	    'preview',
	    'previous',
	    'prewar',
	    'prewashed',
	    'prideful',
	    'pried',
	    'primal',
	    'primarily',
	    'primary',
	    'primate',
	    'primer',
	    'primp',
	    'princess',
	    'print',
	    'prior',
	    'prism',
	    'prison',
	    'prissy',
	    'pristine',
	    'privacy',
	    'private',
	    'privatize',
	    'prize',
	    'proactive',
	    'probable',
	    'probably',
	    'probation',
	    'probe',
	    'probing',
	    'probiotic',
	    'problem',
	    'procedure',
	    'process',
	    'proclaim',
	    'procreate',
	    'procurer',
	    'prodigal',
	    'prodigy',
	    'produce',
	    'product',
	    'profane',
	    'profanity',
	    'professed',
	    'professor',
	    'profile',
	    'profound',
	    'profusely',
	    'progeny',
	    'prognosis',
	    'program',
	    'progress',
	    'projector',
	    'prologue',
	    'prolonged',
	    'promenade',
	    'prominent',
	    'promoter',
	    'promotion',
	    'prompter',
	    'promptly',
	    'prone',
	    'prong',
	    'pronounce',
	    'pronto',
	    'proofing',
	    'proofread',
	    'proofs',
	    'propeller',
	    'properly',
	    'property',
	    'proponent',
	    'proposal',
	    'propose',
	    'props',
	    'prorate',
	    'protector',
	    'protegee',
	    'proton',
	    'prototype',
	    'protozoan',
	    'protract',
	    'protrude',
	    'proud',
	    'provable',
	    'proved',
	    'proven',
	    'provided',
	    'provider',
	    'providing',
	    'province',
	    'proving',
	    'provoke',
	    'provoking',
	    'provolone',
	    'prowess',
	    'prowler',
	    'prowling',
	    'proximity',
	    'proxy',
	    'prozac',
	    'prude',
	    'prudishly',
	    'prune',
	    'pruning',
	    'pry',
	    'psychic',
	    'public',
	    'publisher',
	    'pucker',
	    'pueblo',
	    'pug',
	    'pull',
	    'pulmonary',
	    'pulp',
	    'pulsate',
	    'pulse',
	    'pulverize',
	    'puma',
	    'pumice',
	    'pummel',
	    'punch',
	    'punctual',
	    'punctuate',
	    'punctured',
	    'pungent',
	    'punisher',
	    'punk',
	    'pupil',
	    'puppet',
	    'puppy',
	    'purchase',
	    'pureblood',
	    'purebred',
	    'purely',
	    'pureness',
	    'purgatory',
	    'purge',
	    'purging',
	    'purifier',
	    'purify',
	    'purist',
	    'puritan',
	    'purity',
	    'purple',
	    'purplish',
	    'purposely',
	    'purr',
	    'purse',
	    'pursuable',
	    'pursuant',
	    'pursuit',
	    'purveyor',
	    'pushcart',
	    'pushchair',
	    'pusher',
	    'pushiness',
	    'pushing',
	    'pushover',
	    'pushpin',
	    'pushup',
	    'pushy',
	    'putdown',
	    'putt',
	    'puzzle',
	    'puzzling',
	    'pyramid',
	    'pyromania',
	    'python',
	    'quack',
	    'quadrant',
	    'quail',
	    'quaintly',
	    'quake',
	    'quaking',
	    'qualified',
	    'qualifier',
	    'qualify',
	    'quality',
	    'qualm',
	    'quantum',
	    'quarrel',
	    'quarry',
	    'quartered',
	    'quarterly',
	    'quarters',
	    'quartet',
	    'quench',
	    'query',
	    'quicken',
	    'quickly',
	    'quickness',
	    'quicksand',
	    'quickstep',
	    'quiet',
	    'quill',
	    'quilt',
	    'quintet',
	    'quintuple',
	    'quirk',
	    'quit',
	    'quiver',
	    'quizzical',
	    'quotable',
	    'quotation',
	    'quote',
	    'rabid',
	    'race',
	    'racing',
	    'racism',
	    'rack',
	    'racoon',
	    'radar',
	    'radial',
	    'radiance',
	    'radiantly',
	    'radiated',
	    'radiation',
	    'radiator',
	    'radio',
	    'radish',
	    'raffle',
	    'raft',
	    'rage',
	    'ragged',
	    'raging',
	    'ragweed',
	    'raider',
	    'railcar',
	    'railing',
	    'railroad',
	    'railway',
	    'raisin',
	    'rake',
	    'raking',
	    'rally',
	    'ramble',
	    'rambling',
	    'ramp',
	    'ramrod',
	    'ranch',
	    'rancidity',
	    'random',
	    'ranged',
	    'ranger',
	    'ranging',
	    'ranked',
	    'ranking',
	    'ransack',
	    'ranting',
	    'rants',
	    'rare',
	    'rarity',
	    'rascal',
	    'rash',
	    'rasping',
	    'ravage',
	    'raven',
	    'ravine',
	    'raving',
	    'ravioli',
	    'ravishing',
	    'reabsorb',
	    'reach',
	    'reacquire',
	    'reaction',
	    'reactive',
	    'reactor',
	    'reaffirm',
	    'ream',
	    'reanalyze',
	    'reappear',
	    'reapply',
	    'reappoint',
	    'reapprove',
	    'rearrange',
	    'rearview',
	    'reason',
	    'reassign',
	    'reassure',
	    'reattach',
	    'reawake',
	    'rebalance',
	    'rebate',
	    'rebel',
	    'rebirth',
	    'reboot',
	    'reborn',
	    'rebound',
	    'rebuff',
	    'rebuild',
	    'rebuilt',
	    'reburial',
	    'rebuttal',
	    'recall',
	    'recant',
	    'recapture',
	    'recast',
	    'recede',
	    'recent',
	    'recess',
	    'recharger',
	    'recipient',
	    'recital',
	    'recite',
	    'reckless',
	    'reclaim',
	    'recliner',
	    'reclining',
	    'recluse',
	    'reclusive',
	    'recognize',
	    'recoil',
	    'recollect',
	    'recolor',
	    'reconcile',
	    'reconfirm',
	    'reconvene',
	    'recopy',
	    'record',
	    'recount',
	    'recoup',
	    'recovery',
	    'recreate',
	    'rectal',
	    'rectangle',
	    'rectified',
	    'rectify',
	    'recycled',
	    'recycler',
	    'recycling',
	    'reemerge',
	    'reenact',
	    'reenter',
	    'reentry',
	    'reexamine',
	    'referable',
	    'referee',
	    'reference',
	    'refill',
	    'refinance',
	    'refined',
	    'refinery',
	    'refining',
	    'refinish',
	    'reflected',
	    'reflector',
	    'reflex',
	    'reflux',
	    'refocus',
	    'refold',
	    'reforest',
	    'reformat',
	    'reformed',
	    'reformer',
	    'reformist',
	    'refract',
	    'refrain',
	    'refreeze',
	    'refresh',
	    'refried',
	    'refueling',
	    'refund',
	    'refurbish',
	    'refurnish',
	    'refusal',
	    'refuse',
	    'refusing',
	    'refutable',
	    'refute',
	    'regain',
	    'regalia',
	    'regally',
	    'reggae',
	    'regime',
	    'region',
	    'register',
	    'registrar',
	    'registry',
	    'regress',
	    'regretful',
	    'regroup',
	    'regular',
	    'regulate',
	    'regulator',
	    'rehab',
	    'reheat',
	    'rehire',
	    'rehydrate',
	    'reimburse',
	    'reissue',
	    'reiterate',
	    'rejoice',
	    'rejoicing',
	    'rejoin',
	    'rekindle',
	    'relapse',
	    'relapsing',
	    'relatable',
	    'related',
	    'relation',
	    'relative',
	    'relax',
	    'relay',
	    'relearn',
	    'release',
	    'relenting',
	    'reliable',
	    'reliably',
	    'reliance',
	    'reliant',
	    'relic',
	    'relieve',
	    'relieving',
	    'relight',
	    'relish',
	    'relive',
	    'reload',
	    'relocate',
	    'relock',
	    'reluctant',
	    'rely',
	    'remake',
	    'remark',
	    'remarry',
	    'rematch',
	    'remedial',
	    'remedy',
	    'remember',
	    'reminder',
	    'remindful',
	    'remission',
	    'remix',
	    'remnant',
	    'remodeler',
	    'remold',
	    'remorse',
	    'remote',
	    'removable',
	    'removal',
	    'removed',
	    'remover',
	    'removing',
	    'rename',
	    'renderer',
	    'rendering',
	    'rendition',
	    'renegade',
	    'renewable',
	    'renewably',
	    'renewal',
	    'renewed',
	    'renounce',
	    'renovate',
	    'renovator',
	    'rentable',
	    'rental',
	    'rented',
	    'renter',
	    'reoccupy',
	    'reoccur',
	    'reopen',
	    'reorder',
	    'repackage',
	    'repacking',
	    'repaint',
	    'repair',
	    'repave',
	    'repaying',
	    'repayment',
	    'repeal',
	    'repeated',
	    'repeater',
	    'repent',
	    'rephrase',
	    'replace',
	    'replay',
	    'replica',
	    'reply',
	    'reporter',
	    'repose',
	    'repossess',
	    'repost',
	    'repressed',
	    'reprimand',
	    'reprint',
	    'reprise',
	    'reproach',
	    'reprocess',
	    'reproduce',
	    'reprogram',
	    'reps',
	    'reptile',
	    'reptilian',
	    'repugnant',
	    'repulsion',
	    'repulsive',
	    'repurpose',
	    'reputable',
	    'reputably',
	    'request',
	    'require',
	    'requisite',
	    'reroute',
	    'rerun',
	    'resale',
	    'resample',
	    'rescuer',
	    'reseal',
	    'research',
	    'reselect',
	    'reseller',
	    'resemble',
	    'resend',
	    'resent',
	    'reset',
	    'reshape',
	    'reshoot',
	    'reshuffle',
	    'residence',
	    'residency',
	    'resident',
	    'residual',
	    'residue',
	    'resigned',
	    'resilient',
	    'resistant',
	    'resisting',
	    'resize',
	    'resolute',
	    'resolved',
	    'resonant',
	    'resonate',
	    'resort',
	    'resource',
	    'respect',
	    'resubmit',
	    'result',
	    'resume',
	    'resupply',
	    'resurface',
	    'resurrect',
	    'retail',
	    'retainer',
	    'retaining',
	    'retake',
	    'retaliate',
	    'retention',
	    'rethink',
	    'retinal',
	    'retired',
	    'retiree',
	    'retiring',
	    'retold',
	    'retool',
	    'retorted',
	    'retouch',
	    'retrace',
	    'retract',
	    'retrain',
	    'retread',
	    'retreat',
	    'retrial',
	    'retrieval',
	    'retriever',
	    'retry',
	    'return',
	    'retying',
	    'retype',
	    'reunion',
	    'reunite',
	    'reusable',
	    'reuse',
	    'reveal',
	    'reveler',
	    'revenge',
	    'revenue',
	    'reverb',
	    'revered',
	    'reverence',
	    'reverend',
	    'reversal',
	    'reverse',
	    'reversing',
	    'reversion',
	    'revert',
	    'revisable',
	    'revise',
	    'revision',
	    'revisit',
	    'revivable',
	    'revival',
	    'reviver',
	    'reviving',
	    'revocable',
	    'revoke',
	    'revolt',
	    'revolver',
	    'revolving',
	    'reward',
	    'rewash',
	    'rewind',
	    'rewire',
	    'reword',
	    'rework',
	    'rewrap',
	    'rewrite',
	    'rhyme',
	    'ribbon',
	    'ribcage',
	    'rice',
	    'riches',
	    'richly',
	    'richness',
	    'rickety',
	    'ricotta',
	    'riddance',
	    'ridden',
	    'ride',
	    'riding',
	    'rifling',
	    'rift',
	    'rigging',
	    'rigid',
	    'rigor',
	    'rimless',
	    'rimmed',
	    'rind',
	    'rink',
	    'rinse',
	    'rinsing',
	    'riot',
	    'ripcord',
	    'ripeness',
	    'ripening',
	    'ripping',
	    'ripple',
	    'rippling',
	    'riptide',
	    'rise',
	    'rising',
	    'risk',
	    'risotto',
	    'ritalin',
	    'ritzy',
	    'rival',
	    'riverbank',
	    'riverbed',
	    'riverboat',
	    'riverside',
	    'riveter',
	    'riveting',
	    'roamer',
	    'roaming',
	    'roast',
	    'robbing',
	    'robe',
	    'robin',
	    'robotics',
	    'robust',
	    'rockband',
	    'rocker',
	    'rocket',
	    'rockfish',
	    'rockiness',
	    'rocking',
	    'rocklike',
	    'rockslide',
	    'rockstar',
	    'rocky',
	    'rogue',
	    'roman',
	    'romp',
	    'rope',
	    'roping',
	    'roster',
	    'rosy',
	    'rotten',
	    'rotting',
	    'rotunda',
	    'roulette',
	    'rounding',
	    'roundish',
	    'roundness',
	    'roundup',
	    'roundworm',
	    'routine',
	    'routing',
	    'rover',
	    'roving',
	    'royal',
	    'rubbed',
	    'rubber',
	    'rubbing',
	    'rubble',
	    'rubdown',
	    'ruby',
	    'ruckus',
	    'rudder',
	    'rug',
	    'ruined',
	    'rule',
	    'rumble',
	    'rumbling',
	    'rummage',
	    'rumor',
	    'runaround',
	    'rundown',
	    'runner',
	    'running',
	    'runny',
	    'runt',
	    'runway',
	    'rupture',
	    'rural',
	    'ruse',
	    'rush',
	    'rust',
	    'rut',
	    'sabbath',
	    'sabotage',
	    'sacrament',
	    'sacred',
	    'sacrifice',
	    'sadden',
	    'saddlebag',
	    'saddled',
	    'saddling',
	    'sadly',
	    'sadness',
	    'safari',
	    'safeguard',
	    'safehouse',
	    'safely',
	    'safeness',
	    'saffron',
	    'saga',
	    'sage',
	    'sagging',
	    'saggy',
	    'said',
	    'saint',
	    'sake',
	    'salad',
	    'salami',
	    'salaried',
	    'salary',
	    'saline',
	    'salon',
	    'saloon',
	    'salsa',
	    'salt',
	    'salutary',
	    'salute',
	    'salvage',
	    'salvaging',
	    'salvation',
	    'same',
	    'sample',
	    'sampling',
	    'sanction',
	    'sanctity',
	    'sanctuary',
	    'sandal',
	    'sandbag',
	    'sandbank',
	    'sandbar',
	    'sandblast',
	    'sandbox',
	    'sanded',
	    'sandfish',
	    'sanding',
	    'sandlot',
	    'sandpaper',
	    'sandpit',
	    'sandstone',
	    'sandstorm',
	    'sandworm',
	    'sandy',
	    'sanitary',
	    'sanitizer',
	    'sank',
	    'santa',
	    'sapling',
	    'sappiness',
	    'sappy',
	    'sarcasm',
	    'sarcastic',
	    'sardine',
	    'sash',
	    'sasquatch',
	    'sassy',
	    'satchel',
	    'satiable',
	    'satin',
	    'satirical',
	    'satisfied',
	    'satisfy',
	    'saturate',
	    'saturday',
	    'sauciness',
	    'saucy',
	    'sauna',
	    'savage',
	    'savanna',
	    'saved',
	    'savings',
	    'savior',
	    'savor',
	    'saxophone',
	    'say',
	    'scabbed',
	    'scabby',
	    'scalded',
	    'scalding',
	    'scale',
	    'scaling',
	    'scallion',
	    'scallop',
	    'scalping',
	    'scam',
	    'scandal',
	    'scanner',
	    'scanning',
	    'scant',
	    'scapegoat',
	    'scarce',
	    'scarcity',
	    'scarecrow',
	    'scared',
	    'scarf',
	    'scarily',
	    'scariness',
	    'scarring',
	    'scary',
	    'scavenger',
	    'scenic',
	    'schedule',
	    'schematic',
	    'scheme',
	    'scheming',
	    'schilling',
	    'schnapps',
	    'scholar',
	    'science',
	    'scientist',
	    'scion',
	    'scoff',
	    'scolding',
	    'scone',
	    'scoop',
	    'scooter',
	    'scope',
	    'scorch',
	    'scorebook',
	    'scorecard',
	    'scored',
	    'scoreless',
	    'scorer',
	    'scoring',
	    'scorn',
	    'scorpion',
	    'scotch',
	    'scoundrel',
	    'scoured',
	    'scouring',
	    'scouting',
	    'scouts',
	    'scowling',
	    'scrabble',
	    'scraggly',
	    'scrambled',
	    'scrambler',
	    'scrap',
	    'scratch',
	    'scrawny',
	    'screen',
	    'scribble',
	    'scribe',
	    'scribing',
	    'scrimmage',
	    'script',
	    'scroll',
	    'scrooge',
	    'scrounger',
	    'scrubbed',
	    'scrubber',
	    'scruffy',
	    'scrunch',
	    'scrutiny',
	    'scuba',
	    'scuff',
	    'sculptor',
	    'sculpture',
	    'scurvy',
	    'scuttle',
	    'secluded',
	    'secluding',
	    'seclusion',
	    'second',
	    'secrecy',
	    'secret',
	    'sectional',
	    'sector',
	    'secular',
	    'securely',
	    'security',
	    'sedan',
	    'sedate',
	    'sedation',
	    'sedative',
	    'sediment',
	    'seduce',
	    'seducing',
	    'segment',
	    'seismic',
	    'seizing',
	    'seldom',
	    'selected',
	    'selection',
	    'selective',
	    'selector',
	    'self',
	    'seltzer',
	    'semantic',
	    'semester',
	    'semicolon',
	    'semifinal',
	    'seminar',
	    'semisoft',
	    'semisweet',
	    'senate',
	    'senator',
	    'send',
	    'senior',
	    'senorita',
	    'sensation',
	    'sensitive',
	    'sensitize',
	    'sensually',
	    'sensuous',
	    'sepia',
	    'september',
	    'septic',
	    'septum',
	    'sequel',
	    'sequence',
	    'sequester',
	    'series',
	    'sermon',
	    'serotonin',
	    'serpent',
	    'serrated',
	    'serve',
	    'service',
	    'serving',
	    'sesame',
	    'sessions',
	    'setback',
	    'setting',
	    'settle',
	    'settling',
	    'setup',
	    'sevenfold',
	    'seventeen',
	    'seventh',
	    'seventy',
	    'severity',
	    'shabby',
	    'shack',
	    'shaded',
	    'shadily',
	    'shadiness',
	    'shading',
	    'shadow',
	    'shady',
	    'shaft',
	    'shakable',
	    'shakily',
	    'shakiness',
	    'shaking',
	    'shaky',
	    'shale',
	    'shallot',
	    'shallow',
	    'shame',
	    'shampoo',
	    'shamrock',
	    'shank',
	    'shanty',
	    'shape',
	    'shaping',
	    'share',
	    'sharpener',
	    'sharper',
	    'sharpie',
	    'sharply',
	    'sharpness',
	    'shawl',
	    'sheath',
	    'shed',
	    'sheep',
	    'sheet',
	    'shelf',
	    'shell',
	    'shelter',
	    'shelve',
	    'shelving',
	    'sherry',
	    'shield',
	    'shifter',
	    'shifting',
	    'shiftless',
	    'shifty',
	    'shimmer',
	    'shimmy',
	    'shindig',
	    'shine',
	    'shingle',
	    'shininess',
	    'shining',
	    'shiny',
	    'ship',
	    'shirt',
	    'shivering',
	    'shock',
	    'shone',
	    'shoplift',
	    'shopper',
	    'shopping',
	    'shoptalk',
	    'shore',
	    'shortage',
	    'shortcake',
	    'shortcut',
	    'shorten',
	    'shorter',
	    'shorthand',
	    'shortlist',
	    'shortly',
	    'shortness',
	    'shorts',
	    'shortwave',
	    'shorty',
	    'shout',
	    'shove',
	    'showbiz',
	    'showcase',
	    'showdown',
	    'shower',
	    'showgirl',
	    'showing',
	    'showman',
	    'shown',
	    'showoff',
	    'showpiece',
	    'showplace',
	    'showroom',
	    'showy',
	    'shrank',
	    'shrapnel',
	    'shredder',
	    'shredding',
	    'shrewdly',
	    'shriek',
	    'shrill',
	    'shrimp',
	    'shrine',
	    'shrink',
	    'shrivel',
	    'shrouded',
	    'shrubbery',
	    'shrubs',
	    'shrug',
	    'shrunk',
	    'shucking',
	    'shudder',
	    'shuffle',
	    'shuffling',
	    'shun',
	    'shush',
	    'shut',
	    'shy',
	    'siamese',
	    'siberian',
	    'sibling',
	    'siding',
	    'sierra',
	    'siesta',
	    'sift',
	    'sighing',
	    'silenced',
	    'silencer',
	    'silent',
	    'silica',
	    'silicon',
	    'silk',
	    'silliness',
	    'silly',
	    'silo',
	    'silt',
	    'silver',
	    'similarly',
	    'simile',
	    'simmering',
	    'simple',
	    'simplify',
	    'simply',
	    'sincere',
	    'sincerity',
	    'singer',
	    'singing',
	    'single',
	    'singular',
	    'sinister',
	    'sinless',
	    'sinner',
	    'sinuous',
	    'sip',
	    'siren',
	    'sister',
	    'sitcom',
	    'sitter',
	    'sitting',
	    'situated',
	    'situation',
	    'sixfold',
	    'sixteen',
	    'sixth',
	    'sixties',
	    'sixtieth',
	    'sixtyfold',
	    'sizable',
	    'sizably',
	    'size',
	    'sizing',
	    'sizzle',
	    'sizzling',
	    'skater',
	    'skating',
	    'skedaddle',
	    'skeletal',
	    'skeleton',
	    'skeptic',
	    'sketch',
	    'skewed',
	    'skewer',
	    'skid',
	    'skied',
	    'skier',
	    'skies',
	    'skiing',
	    'skilled',
	    'skillet',
	    'skillful',
	    'skimmed',
	    'skimmer',
	    'skimming',
	    'skimpily',
	    'skincare',
	    'skinhead',
	    'skinless',
	    'skinning',
	    'skinny',
	    'skintight',
	    'skipper',
	    'skipping',
	    'skirmish',
	    'skirt',
	    'skittle',
	    'skydiver',
	    'skylight',
	    'skyline',
	    'skype',
	    'skyrocket',
	    'skyward',
	    'slab',
	    'slacked',
	    'slacker',
	    'slacking',
	    'slackness',
	    'slacks',
	    'slain',
	    'slam',
	    'slander',
	    'slang',
	    'slapping',
	    'slapstick',
	    'slashed',
	    'slashing',
	    'slate',
	    'slather',
	    'slaw',
	    'sled',
	    'sleek',
	    'sleep',
	    'sleet',
	    'sleeve',
	    'slept',
	    'sliceable',
	    'sliced',
	    'slicer',
	    'slicing',
	    'slick',
	    'slider',
	    'slideshow',
	    'sliding',
	    'slighted',
	    'slighting',
	    'slightly',
	    'slimness',
	    'slimy',
	    'slinging',
	    'slingshot',
	    'slinky',
	    'slip',
	    'slit',
	    'sliver',
	    'slobbery',
	    'slogan',
	    'sloped',
	    'sloping',
	    'sloppily',
	    'sloppy',
	    'slot',
	    'slouching',
	    'slouchy',
	    'sludge',
	    'slug',
	    'slum',
	    'slurp',
	    'slush',
	    'sly',
	    'small',
	    'smartly',
	    'smartness',
	    'smasher',
	    'smashing',
	    'smashup',
	    'smell',
	    'smelting',
	    'smile',
	    'smilingly',
	    'smirk',
	    'smite',
	    'smith',
	    'smitten',
	    'smock',
	    'smog',
	    'smoked',
	    'smokeless',
	    'smokiness',
	    'smoking',
	    'smoky',
	    'smolder',
	    'smooth',
	    'smother',
	    'smudge',
	    'smudgy',
	    'smuggler',
	    'smuggling',
	    'smugly',
	    'smugness',
	    'snack',
	    'snagged',
	    'snaking',
	    'snap',
	    'snare',
	    'snarl',
	    'snazzy',
	    'sneak',
	    'sneer',
	    'sneeze',
	    'sneezing',
	    'snide',
	    'sniff',
	    'snippet',
	    'snipping',
	    'snitch',
	    'snooper',
	    'snooze',
	    'snore',
	    'snoring',
	    'snorkel',
	    'snort',
	    'snout',
	    'snowbird',
	    'snowboard',
	    'snowbound',
	    'snowcap',
	    'snowdrift',
	    'snowdrop',
	    'snowfall',
	    'snowfield',
	    'snowflake',
	    'snowiness',
	    'snowless',
	    'snowman',
	    'snowplow',
	    'snowshoe',
	    'snowstorm',
	    'snowsuit',
	    'snowy',
	    'snub',
	    'snuff',
	    'snuggle',
	    'snugly',
	    'snugness',
	    'speak',
	    'spearfish',
	    'spearhead',
	    'spearman',
	    'spearmint',
	    'species',
	    'specimen',
	    'specked',
	    'speckled',
	    'specks',
	    'spectacle',
	    'spectator',
	    'spectrum',
	    'speculate',
	    'speech',
	    'speed',
	    'spellbind',
	    'speller',
	    'spelling',
	    'spendable',
	    'spender',
	    'spending',
	    'spent',
	    'spew',
	    'sphere',
	    'spherical',
	    'sphinx',
	    'spider',
	    'spied',
	    'spiffy',
	    'spill',
	    'spilt',
	    'spinach',
	    'spinal',
	    'spindle',
	    'spinner',
	    'spinning',
	    'spinout',
	    'spinster',
	    'spiny',
	    'spiral',
	    'spirited',
	    'spiritism',
	    'spirits',
	    'spiritual',
	    'splashed',
	    'splashing',
	    'splashy',
	    'splatter',
	    'spleen',
	    'splendid',
	    'splendor',
	    'splice',
	    'splicing',
	    'splinter',
	    'splotchy',
	    'splurge',
	    'spoilage',
	    'spoiled',
	    'spoiler',
	    'spoiling',
	    'spoils',
	    'spoken',
	    'spokesman',
	    'sponge',
	    'spongy',
	    'sponsor',
	    'spoof',
	    'spookily',
	    'spooky',
	    'spool',
	    'spoon',
	    'spore',
	    'sporting',
	    'sports',
	    'sporty',
	    'spotless',
	    'spotlight',
	    'spotted',
	    'spotter',
	    'spotting',
	    'spotty',
	    'spousal',
	    'spouse',
	    'spout',
	    'sprain',
	    'sprang',
	    'sprawl',
	    'spray',
	    'spree',
	    'sprig',
	    'spring',
	    'sprinkled',
	    'sprinkler',
	    'sprint',
	    'sprite',
	    'sprout',
	    'spruce',
	    'sprung',
	    'spry',
	    'spud',
	    'spur',
	    'sputter',
	    'spyglass',
	    'squabble',
	    'squad',
	    'squall',
	    'squander',
	    'squash',
	    'squatted',
	    'squatter',
	    'squatting',
	    'squeak',
	    'squealer',
	    'squealing',
	    'squeamish',
	    'squeegee',
	    'squeeze',
	    'squeezing',
	    'squid',
	    'squiggle',
	    'squiggly',
	    'squint',
	    'squire',
	    'squirt',
	    'squishier',
	    'squishy',
	    'stability',
	    'stabilize',
	    'stable',
	    'stack',
	    'stadium',
	    'staff',
	    'stage',
	    'staging',
	    'stagnant',
	    'stagnate',
	    'stainable',
	    'stained',
	    'staining',
	    'stainless',
	    'stalemate',
	    'staleness',
	    'stalling',
	    'stallion',
	    'stamina',
	    'stammer',
	    'stamp',
	    'stand',
	    'stank',
	    'staple',
	    'stapling',
	    'starboard',
	    'starch',
	    'stardom',
	    'stardust',
	    'starfish',
	    'stargazer',
	    'staring',
	    'stark',
	    'starless',
	    'starlet',
	    'starlight',
	    'starlit',
	    'starring',
	    'starry',
	    'starship',
	    'starter',
	    'starting',
	    'startle',
	    'startling',
	    'startup',
	    'starved',
	    'starving',
	    'stash',
	    'state',
	    'static',
	    'statistic',
	    'statue',
	    'stature',
	    'status',
	    'statute',
	    'statutory',
	    'staunch',
	    'stays',
	    'steadfast',
	    'steadier',
	    'steadily',
	    'steadying',
	    'steam',
	    'steed',
	    'steep',
	    'steerable',
	    'steering',
	    'steersman',
	    'stegosaur',
	    'stellar',
	    'stem',
	    'stench',
	    'stencil',
	    'step',
	    'stereo',
	    'sterile',
	    'sterility',
	    'sterilize',
	    'sterling',
	    'sternness',
	    'sternum',
	    'stew',
	    'stick',
	    'stiffen',
	    'stiffly',
	    'stiffness',
	    'stifle',
	    'stifling',
	    'stillness',
	    'stilt',
	    'stimulant',
	    'stimulate',
	    'stimuli',
	    'stimulus',
	    'stinger',
	    'stingily',
	    'stinging',
	    'stingray',
	    'stingy',
	    'stinking',
	    'stinky',
	    'stipend',
	    'stipulate',
	    'stir',
	    'stitch',
	    'stock',
	    'stoic',
	    'stoke',
	    'stole',
	    'stomp',
	    'stonewall',
	    'stoneware',
	    'stonework',
	    'stoning',
	    'stony',
	    'stood',
	    'stooge',
	    'stool',
	    'stoop',
	    'stoplight',
	    'stoppable',
	    'stoppage',
	    'stopped',
	    'stopper',
	    'stopping',
	    'stopwatch',
	    'storable',
	    'storage',
	    'storeroom',
	    'storewide',
	    'storm',
	    'stout',
	    'stove',
	    'stowaway',
	    'stowing',
	    'straddle',
	    'straggler',
	    'strained',
	    'strainer',
	    'straining',
	    'strangely',
	    'stranger',
	    'strangle',
	    'strategic',
	    'strategy',
	    'stratus',
	    'straw',
	    'stray',
	    'streak',
	    'stream',
	    'street',
	    'strength',
	    'strenuous',
	    'strep',
	    'stress',
	    'stretch',
	    'strewn',
	    'stricken',
	    'strict',
	    'stride',
	    'strife',
	    'strike',
	    'striking',
	    'strive',
	    'striving',
	    'strobe',
	    'strode',
	    'stroller',
	    'strongbox',
	    'strongly',
	    'strongman',
	    'struck',
	    'structure',
	    'strudel',
	    'struggle',
	    'strum',
	    'strung',
	    'strut',
	    'stubbed',
	    'stubble',
	    'stubbly',
	    'stubborn',
	    'stucco',
	    'stuck',
	    'student',
	    'studied',
	    'studio',
	    'study',
	    'stuffed',
	    'stuffing',
	    'stuffy',
	    'stumble',
	    'stumbling',
	    'stump',
	    'stung',
	    'stunned',
	    'stunner',
	    'stunning',
	    'stunt',
	    'stupor',
	    'sturdily',
	    'sturdy',
	    'styling',
	    'stylishly',
	    'stylist',
	    'stylized',
	    'stylus',
	    'suave',
	    'subarctic',
	    'subatomic',
	    'subdivide',
	    'subdued',
	    'subduing',
	    'subfloor',
	    'subgroup',
	    'subheader',
	    'subject',
	    'sublease',
	    'sublet',
	    'sublevel',
	    'sublime',
	    'submarine',
	    'submerge',
	    'submersed',
	    'submitter',
	    'subpanel',
	    'subpar',
	    'subplot',
	    'subprime',
	    'subscribe',
	    'subscript',
	    'subsector',
	    'subside',
	    'subsiding',
	    'subsidize',
	    'subsidy',
	    'subsoil',
	    'subsonic',
	    'substance',
	    'subsystem',
	    'subtext',
	    'subtitle',
	    'subtly',
	    'subtotal',
	    'subtract',
	    'subtype',
	    'suburb',
	    'subway',
	    'subwoofer',
	    'subzero',
	    'succulent',
	    'such',
	    'suction',
	    'sudden',
	    'sudoku',
	    'suds',
	    'sufferer',
	    'suffering',
	    'suffice',
	    'suffix',
	    'suffocate',
	    'suffrage',
	    'sugar',
	    'suggest',
	    'suing',
	    'suitable',
	    'suitably',
	    'suitcase',
	    'suitor',
	    'sulfate',
	    'sulfide',
	    'sulfite',
	    'sulfur',
	    'sulk',
	    'sullen',
	    'sulphate',
	    'sulphuric',
	    'sultry',
	    'superbowl',
	    'superglue',
	    'superhero',
	    'superior',
	    'superjet',
	    'superman',
	    'supermom',
	    'supernova',
	    'supervise',
	    'supper',
	    'supplier',
	    'supply',
	    'support',
	    'supremacy',
	    'supreme',
	    'surcharge',
	    'surely',
	    'sureness',
	    'surface',
	    'surfacing',
	    'surfboard',
	    'surfer',
	    'surgery',
	    'surgical',
	    'surging',
	    'surname',
	    'surpass',
	    'surplus',
	    'surprise',
	    'surreal',
	    'surrender',
	    'surrogate',
	    'surround',
	    'survey',
	    'survival',
	    'survive',
	    'surviving',
	    'survivor',
	    'sushi',
	    'suspect',
	    'suspend',
	    'suspense',
	    'sustained',
	    'sustainer',
	    'swab',
	    'swaddling',
	    'swagger',
	    'swampland',
	    'swan',
	    'swapping',
	    'swarm',
	    'sway',
	    'swear',
	    'sweat',
	    'sweep',
	    'swell',
	    'swept',
	    'swerve',
	    'swifter',
	    'swiftly',
	    'swiftness',
	    'swimmable',
	    'swimmer',
	    'swimming',
	    'swimsuit',
	    'swimwear',
	    'swinger',
	    'swinging',
	    'swipe',
	    'swirl',
	    'switch',
	    'swivel',
	    'swizzle',
	    'swooned',
	    'swoop',
	    'swoosh',
	    'swore',
	    'sworn',
	    'swung',
	    'sycamore',
	    'sympathy',
	    'symphonic',
	    'symphony',
	    'symptom',
	    'synapse',
	    'syndrome',
	    'synergy',
	    'synopses',
	    'synopsis',
	    'synthesis',
	    'synthetic',
	    'syrup',
	    'system',
	    't-shirt',
	    'tabasco',
	    'tabby',
	    'tableful',
	    'tables',
	    'tablet',
	    'tableware',
	    'tabloid',
	    'tackiness',
	    'tacking',
	    'tackle',
	    'tackling',
	    'tacky',
	    'taco',
	    'tactful',
	    'tactical',
	    'tactics',
	    'tactile',
	    'tactless',
	    'tadpole',
	    'taekwondo',
	    'tag',
	    'tainted',
	    'take',
	    'taking',
	    'talcum',
	    'talisman',
	    'tall',
	    'talon',
	    'tamale',
	    'tameness',
	    'tamer',
	    'tamper',
	    'tank',
	    'tanned',
	    'tannery',
	    'tanning',
	    'tantrum',
	    'tapeless',
	    'tapered',
	    'tapering',
	    'tapestry',
	    'tapioca',
	    'tapping',
	    'taps',
	    'tarantula',
	    'target',
	    'tarmac',
	    'tarnish',
	    'tarot',
	    'tartar',
	    'tartly',
	    'tartness',
	    'task',
	    'tassel',
	    'taste',
	    'tastiness',
	    'tasting',
	    'tasty',
	    'tattered',
	    'tattle',
	    'tattling',
	    'tattoo',
	    'taunt',
	    'tavern',
	    'thank',
	    'that',
	    'thaw',
	    'theater',
	    'theatrics',
	    'thee',
	    'theft',
	    'theme',
	    'theology',
	    'theorize',
	    'thermal',
	    'thermos',
	    'thesaurus',
	    'these',
	    'thesis',
	    'thespian',
	    'thicken',
	    'thicket',
	    'thickness',
	    'thieving',
	    'thievish',
	    'thigh',
	    'thimble',
	    'thing',
	    'think',
	    'thinly',
	    'thinner',
	    'thinness',
	    'thinning',
	    'thirstily',
	    'thirsting',
	    'thirsty',
	    'thirteen',
	    'thirty',
	    'thong',
	    'thorn',
	    'those',
	    'thousand',
	    'thrash',
	    'thread',
	    'threaten',
	    'threefold',
	    'thrift',
	    'thrill',
	    'thrive',
	    'thriving',
	    'throat',
	    'throbbing',
	    'throng',
	    'throttle',
	    'throwaway',
	    'throwback',
	    'thrower',
	    'throwing',
	    'thud',
	    'thumb',
	    'thumping',
	    'thursday',
	    'thus',
	    'thwarting',
	    'thyself',
	    'tiara',
	    'tibia',
	    'tidal',
	    'tidbit',
	    'tidiness',
	    'tidings',
	    'tidy',
	    'tiger',
	    'tighten',
	    'tightly',
	    'tightness',
	    'tightrope',
	    'tightwad',
	    'tigress',
	    'tile',
	    'tiling',
	    'till',
	    'tilt',
	    'timid',
	    'timing',
	    'timothy',
	    'tinderbox',
	    'tinfoil',
	    'tingle',
	    'tingling',
	    'tingly',
	    'tinker',
	    'tinkling',
	    'tinsel',
	    'tinsmith',
	    'tint',
	    'tinwork',
	    'tiny',
	    'tipoff',
	    'tipped',
	    'tipper',
	    'tipping',
	    'tiptoeing',
	    'tiptop',
	    'tiring',
	    'tissue',
	    'trace',
	    'tracing',
	    'track',
	    'traction',
	    'tractor',
	    'trade',
	    'trading',
	    'tradition',
	    'traffic',
	    'tragedy',
	    'trailing',
	    'trailside',
	    'train',
	    'traitor',
	    'trance',
	    'tranquil',
	    'transfer',
	    'transform',
	    'translate',
	    'transpire',
	    'transport',
	    'transpose',
	    'trapdoor',
	    'trapeze',
	    'trapezoid',
	    'trapped',
	    'trapper',
	    'trapping',
	    'traps',
	    'trash',
	    'travel',
	    'traverse',
	    'travesty',
	    'tray',
	    'treachery',
	    'treading',
	    'treadmill',
	    'treason',
	    'treat',
	    'treble',
	    'tree',
	    'trekker',
	    'tremble',
	    'trembling',
	    'tremor',
	    'trench',
	    'trend',
	    'trespass',
	    'triage',
	    'trial',
	    'triangle',
	    'tribesman',
	    'tribunal',
	    'tribune',
	    'tributary',
	    'tribute',
	    'triceps',
	    'trickery',
	    'trickily',
	    'tricking',
	    'trickle',
	    'trickster',
	    'tricky',
	    'tricolor',
	    'tricycle',
	    'trident',
	    'tried',
	    'trifle',
	    'trifocals',
	    'trillion',
	    'trilogy',
	    'trimester',
	    'trimmer',
	    'trimming',
	    'trimness',
	    'trinity',
	    'trio',
	    'tripod',
	    'tripping',
	    'triumph',
	    'trivial',
	    'trodden',
	    'trolling',
	    'trombone',
	    'trophy',
	    'tropical',
	    'tropics',
	    'trouble',
	    'troubling',
	    'trough',
	    'trousers',
	    'trout',
	    'trowel',
	    'truce',
	    'truck',
	    'truffle',
	    'trump',
	    'trunks',
	    'trustable',
	    'trustee',
	    'trustful',
	    'trusting',
	    'trustless',
	    'truth',
	    'try',
	    'tubby',
	    'tubeless',
	    'tubular',
	    'tucking',
	    'tuesday',
	    'tug',
	    'tuition',
	    'tulip',
	    'tumble',
	    'tumbling',
	    'tummy',
	    'turban',
	    'turbine',
	    'turbofan',
	    'turbojet',
	    'turbulent',
	    'turf',
	    'turkey',
	    'turmoil',
	    'turret',
	    'turtle',
	    'tusk',
	    'tutor',
	    'tutu',
	    'tux',
	    'tweak',
	    'tweed',
	    'tweet',
	    'tweezers',
	    'twelve',
	    'twentieth',
	    'twenty',
	    'twerp',
	    'twice',
	    'twiddle',
	    'twiddling',
	    'twig',
	    'twilight',
	    'twine',
	    'twins',
	    'twirl',
	    'twistable',
	    'twisted',
	    'twister',
	    'twisting',
	    'twisty',
	    'twitch',
	    'twitter',
	    'tycoon',
	    'tying',
	    'tyke',
	    'udder',
	    'ultimate',
	    'ultimatum',
	    'ultra',
	    'umbilical',
	    'umbrella',
	    'umpire',
	    'unabashed',
	    'unable',
	    'unadorned',
	    'unadvised',
	    'unafraid',
	    'unaired',
	    'unaligned',
	    'unaltered',
	    'unarmored',
	    'unashamed',
	    'unaudited',
	    'unawake',
	    'unaware',
	    'unbaked',
	    'unbalance',
	    'unbeaten',
	    'unbend',
	    'unbent',
	    'unbiased',
	    'unbitten',
	    'unblended',
	    'unblessed',
	    'unblock',
	    'unbolted',
	    'unbounded',
	    'unboxed',
	    'unbraided',
	    'unbridle',
	    'unbroken',
	    'unbuckled',
	    'unbundle',
	    'unburned',
	    'unbutton',
	    'uncanny',
	    'uncapped',
	    'uncaring',
	    'uncertain',
	    'unchain',
	    'unchanged',
	    'uncharted',
	    'uncheck',
	    'uncivil',
	    'unclad',
	    'unclaimed',
	    'unclamped',
	    'unclasp',
	    'uncle',
	    'unclip',
	    'uncloak',
	    'unclog',
	    'unclothed',
	    'uncoated',
	    'uncoiled',
	    'uncolored',
	    'uncombed',
	    'uncommon',
	    'uncooked',
	    'uncork',
	    'uncorrupt',
	    'uncounted',
	    'uncouple',
	    'uncouth',
	    'uncover',
	    'uncross',
	    'uncrown',
	    'uncrushed',
	    'uncured',
	    'uncurious',
	    'uncurled',
	    'uncut',
	    'undamaged',
	    'undated',
	    'undaunted',
	    'undead',
	    'undecided',
	    'undefined',
	    'underage',
	    'underarm',
	    'undercoat',
	    'undercook',
	    'undercut',
	    'underdog',
	    'underdone',
	    'underfed',
	    'underfeed',
	    'underfoot',
	    'undergo',
	    'undergrad',
	    'underhand',
	    'underline',
	    'underling',
	    'undermine',
	    'undermost',
	    'underpaid',
	    'underpass',
	    'underpay',
	    'underrate',
	    'undertake',
	    'undertone',
	    'undertook',
	    'undertow',
	    'underuse',
	    'underwear',
	    'underwent',
	    'underwire',
	    'undesired',
	    'undiluted',
	    'undivided',
	    'undocked',
	    'undoing',
	    'undone',
	    'undrafted',
	    'undress',
	    'undrilled',
	    'undusted',
	    'undying',
	    'unearned',
	    'unearth',
	    'unease',
	    'uneasily',
	    'uneasy',
	    'uneatable',
	    'uneaten',
	    'unedited',
	    'unelected',
	    'unending',
	    'unengaged',
	    'unenvied',
	    'unequal',
	    'unethical',
	    'uneven',
	    'unexpired',
	    'unexposed',
	    'unfailing',
	    'unfair',
	    'unfasten',
	    'unfazed',
	    'unfeeling',
	    'unfiled',
	    'unfilled',
	    'unfitted',
	    'unfitting',
	    'unfixable',
	    'unfixed',
	    'unflawed',
	    'unfocused',
	    'unfold',
	    'unfounded',
	    'unframed',
	    'unfreeze',
	    'unfrosted',
	    'unfrozen',
	    'unfunded',
	    'unglazed',
	    'ungloved',
	    'unglue',
	    'ungodly',
	    'ungraded',
	    'ungreased',
	    'unguarded',
	    'unguided',
	    'unhappily',
	    'unhappy',
	    'unharmed',
	    'unhealthy',
	    'unheard',
	    'unhearing',
	    'unheated',
	    'unhelpful',
	    'unhidden',
	    'unhinge',
	    'unhitched',
	    'unholy',
	    'unhook',
	    'unicorn',
	    'unicycle',
	    'unified',
	    'unifier',
	    'uniformed',
	    'uniformly',
	    'unify',
	    'unimpeded',
	    'uninjured',
	    'uninstall',
	    'uninsured',
	    'uninvited',
	    'union',
	    'uniquely',
	    'unisexual',
	    'unison',
	    'unissued',
	    'unit',
	    'universal',
	    'universe',
	    'unjustly',
	    'unkempt',
	    'unkind',
	    'unknotted',
	    'unknowing',
	    'unknown',
	    'unlaced',
	    'unlatch',
	    'unlawful',
	    'unleaded',
	    'unlearned',
	    'unleash',
	    'unless',
	    'unleveled',
	    'unlighted',
	    'unlikable',
	    'unlimited',
	    'unlined',
	    'unlinked',
	    'unlisted',
	    'unlit',
	    'unlivable',
	    'unloaded',
	    'unloader',
	    'unlocked',
	    'unlocking',
	    'unlovable',
	    'unloved',
	    'unlovely',
	    'unloving',
	    'unluckily',
	    'unlucky',
	    'unmade',
	    'unmanaged',
	    'unmanned',
	    'unmapped',
	    'unmarked',
	    'unmasked',
	    'unmasking',
	    'unmatched',
	    'unmindful',
	    'unmixable',
	    'unmixed',
	    'unmolded',
	    'unmoral',
	    'unmovable',
	    'unmoved',
	    'unmoving',
	    'unnamable',
	    'unnamed',
	    'unnatural',
	    'unneeded',
	    'unnerve',
	    'unnerving',
	    'unnoticed',
	    'unopened',
	    'unopposed',
	    'unpack',
	    'unpadded',
	    'unpaid',
	    'unpainted',
	    'unpaired',
	    'unpaved',
	    'unpeeled',
	    'unpicked',
	    'unpiloted',
	    'unpinned',
	    'unplanned',
	    'unplanted',
	    'unpleased',
	    'unpledged',
	    'unplowed',
	    'unplug',
	    'unpopular',
	    'unproven',
	    'unquote',
	    'unranked',
	    'unrated',
	    'unraveled',
	    'unreached',
	    'unread',
	    'unreal',
	    'unreeling',
	    'unrefined',
	    'unrelated',
	    'unrented',
	    'unrest',
	    'unretired',
	    'unrevised',
	    'unrigged',
	    'unripe',
	    'unrivaled',
	    'unroasted',
	    'unrobed',
	    'unroll',
	    'unruffled',
	    'unruly',
	    'unrushed',
	    'unsaddle',
	    'unsafe',
	    'unsaid',
	    'unsalted',
	    'unsaved',
	    'unsavory',
	    'unscathed',
	    'unscented',
	    'unscrew',
	    'unsealed',
	    'unseated',
	    'unsecured',
	    'unseeing',
	    'unseemly',
	    'unseen',
	    'unselect',
	    'unselfish',
	    'unsent',
	    'unsettled',
	    'unshackle',
	    'unshaken',
	    'unshaved',
	    'unshaven',
	    'unsheathe',
	    'unshipped',
	    'unsightly',
	    'unsigned',
	    'unskilled',
	    'unsliced',
	    'unsmooth',
	    'unsnap',
	    'unsocial',
	    'unsoiled',
	    'unsold',
	    'unsolved',
	    'unsorted',
	    'unspoiled',
	    'unspoken',
	    'unstable',
	    'unstaffed',
	    'unstamped',
	    'unsteady',
	    'unsterile',
	    'unstirred',
	    'unstitch',
	    'unstopped',
	    'unstuck',
	    'unstuffed',
	    'unstylish',
	    'unsubtle',
	    'unsubtly',
	    'unsuited',
	    'unsure',
	    'unsworn',
	    'untagged',
	    'untainted',
	    'untaken',
	    'untamed',
	    'untangled',
	    'untapped',
	    'untaxed',
	    'unthawed',
	    'unthread',
	    'untidy',
	    'untie',
	    'until',
	    'untimed',
	    'untimely',
	    'untitled',
	    'untoasted',
	    'untold',
	    'untouched',
	    'untracked',
	    'untrained',
	    'untreated',
	    'untried',
	    'untrimmed',
	    'untrue',
	    'untruth',
	    'unturned',
	    'untwist',
	    'untying',
	    'unusable',
	    'unused',
	    'unusual',
	    'unvalued',
	    'unvaried',
	    'unvarying',
	    'unveiled',
	    'unveiling',
	    'unvented',
	    'unviable',
	    'unvisited',
	    'unvocal',
	    'unwanted',
	    'unwarlike',
	    'unwary',
	    'unwashed',
	    'unwatched',
	    'unweave',
	    'unwed',
	    'unwelcome',
	    'unwell',
	    'unwieldy',
	    'unwilling',
	    'unwind',
	    'unwired',
	    'unwitting',
	    'unwomanly',
	    'unworldly',
	    'unworn',
	    'unworried',
	    'unworthy',
	    'unwound',
	    'unwoven',
	    'unwrapped',
	    'unwritten',
	    'unzip',
	    'upbeat',
	    'upchuck',
	    'upcoming',
	    'upcountry',
	    'update',
	    'upfront',
	    'upgrade',
	    'upheaval',
	    'upheld',
	    'uphill',
	    'uphold',
	    'uplifted',
	    'uplifting',
	    'upload',
	    'upon',
	    'upper',
	    'upright',
	    'uprising',
	    'upriver',
	    'uproar',
	    'uproot',
	    'upscale',
	    'upside',
	    'upstage',
	    'upstairs',
	    'upstart',
	    'upstate',
	    'upstream',
	    'upstroke',
	    'upswing',
	    'uptake',
	    'uptight',
	    'uptown',
	    'upturned',
	    'upward',
	    'upwind',
	    'uranium',
	    'urban',
	    'urchin',
	    'urethane',
	    'urgency',
	    'urgent',
	    'urging',
	    'urologist',
	    'urology',
	    'usable',
	    'usage',
	    'useable',
	    'used',
	    'uselessly',
	    'user',
	    'usher',
	    'usual',
	    'utensil',
	    'utility',
	    'utilize',
	    'utmost',
	    'utopia',
	    'utter',
	    'vacancy',
	    'vacant',
	    'vacate',
	    'vacation',
	    'vagabond',
	    'vagrancy',
	    'vagrantly',
	    'vaguely',
	    'vagueness',
	    'valiant',
	    'valid',
	    'valium',
	    'valley',
	    'valuables',
	    'value',
	    'vanilla',
	    'vanish',
	    'vanity',
	    'vanquish',
	    'vantage',
	    'vaporizer',
	    'variable',
	    'variably',
	    'varied',
	    'variety',
	    'various',
	    'varmint',
	    'varnish',
	    'varsity',
	    'varying',
	    'vascular',
	    'vaseline',
	    'vastly',
	    'vastness',
	    'veal',
	    'vegan',
	    'veggie',
	    'vehicular',
	    'velcro',
	    'velocity',
	    'velvet',
	    'vendetta',
	    'vending',
	    'vendor',
	    'veneering',
	    'vengeful',
	    'venomous',
	    'ventricle',
	    'venture',
	    'venue',
	    'venus',
	    'verbalize',
	    'verbally',
	    'verbose',
	    'verdict',
	    'verify',
	    'verse',
	    'version',
	    'versus',
	    'vertebrae',
	    'vertical',
	    'vertigo',
	    'very',
	    'vessel',
	    'vest',
	    'veteran',
	    'veto',
	    'vexingly',
	    'viability',
	    'viable',
	    'vibes',
	    'vice',
	    'vicinity',
	    'victory',
	    'video',
	    'viewable',
	    'viewer',
	    'viewing',
	    'viewless',
	    'viewpoint',
	    'vigorous',
	    'village',
	    'villain',
	    'vindicate',
	    'vineyard',
	    'vintage',
	    'violate',
	    'violation',
	    'violator',
	    'violet',
	    'violin',
	    'viper',
	    'viral',
	    'virtual',
	    'virtuous',
	    'virus',
	    'visa',
	    'viscosity',
	    'viscous',
	    'viselike',
	    'visible',
	    'visibly',
	    'vision',
	    'visiting',
	    'visitor',
	    'visor',
	    'vista',
	    'vitality',
	    'vitalize',
	    'vitally',
	    'vitamins',
	    'vivacious',
	    'vividly',
	    'vividness',
	    'vixen',
	    'vocalist',
	    'vocalize',
	    'vocally',
	    'vocation',
	    'voice',
	    'voicing',
	    'void',
	    'volatile',
	    'volley',
	    'voltage',
	    'volumes',
	    'voter',
	    'voting',
	    'voucher',
	    'vowed',
	    'vowel',
	    'voyage',
	    'wackiness',
	    'wad',
	    'wafer',
	    'waffle',
	    'waged',
	    'wager',
	    'wages',
	    'waggle',
	    'wagon',
	    'wake',
	    'waking',
	    'walk',
	    'walmart',
	    'walnut',
	    'walrus',
	    'waltz',
	    'wand',
	    'wannabe',
	    'wanted',
	    'wanting',
	    'wasabi',
	    'washable',
	    'washbasin',
	    'washboard',
	    'washbowl',
	    'washcloth',
	    'washday',
	    'washed',
	    'washer',
	    'washhouse',
	    'washing',
	    'washout',
	    'washroom',
	    'washstand',
	    'washtub',
	    'wasp',
	    'wasting',
	    'watch',
	    'water',
	    'waviness',
	    'waving',
	    'wavy',
	    'whacking',
	    'whacky',
	    'wham',
	    'wharf',
	    'wheat',
	    'whenever',
	    'whiff',
	    'whimsical',
	    'whinny',
	    'whiny',
	    'whisking',
	    'whoever',
	    'whole',
	    'whomever',
	    'whoopee',
	    'whooping',
	    'whoops',
	    'why',
	    'wick',
	    'widely',
	    'widen',
	    'widget',
	    'widow',
	    'width',
	    'wieldable',
	    'wielder',
	    'wife',
	    'wifi',
	    'wikipedia',
	    'wildcard',
	    'wildcat',
	    'wilder',
	    'wildfire',
	    'wildfowl',
	    'wildland',
	    'wildlife',
	    'wildly',
	    'wildness',
	    'willed',
	    'willfully',
	    'willing',
	    'willow',
	    'willpower',
	    'wilt',
	    'wimp',
	    'wince',
	    'wincing',
	    'wind',
	    'wing',
	    'winking',
	    'winner',
	    'winnings',
	    'winter',
	    'wipe',
	    'wired',
	    'wireless',
	    'wiring',
	    'wiry',
	    'wisdom',
	    'wise',
	    'wish',
	    'wisplike',
	    'wispy',
	    'wistful',
	    'wizard',
	    'wobble',
	    'wobbling',
	    'wobbly',
	    'wok',
	    'wolf',
	    'wolverine',
	    'womanhood',
	    'womankind',
	    'womanless',
	    'womanlike',
	    'womanly',
	    'womb',
	    'woof',
	    'wooing',
	    'wool',
	    'woozy',
	    'word',
	    'work',
	    'worried',
	    'worrier',
	    'worrisome',
	    'worry',
	    'worsening',
	    'worshiper',
	    'worst',
	    'wound',
	    'woven',
	    'wow',
	    'wrangle',
	    'wrath',
	    'wreath',
	    'wreckage',
	    'wrecker',
	    'wrecking',
	    'wrench',
	    'wriggle',
	    'wriggly',
	    'wrinkle',
	    'wrinkly',
	    'wrist',
	    'writing',
	    'written',
	    'wrongdoer',
	    'wronged',
	    'wrongful',
	    'wrongly',
	    'wrongness',
	    'wrought',
	    'xbox',
	    'xerox',
	    'yahoo',
	    'yam',
	    'yanking',
	    'yapping',
	    'yard',
	    'yarn',
	    'yeah',
	    'yearbook',
	    'yearling',
	    'yearly',
	    'yearning',
	    'yeast',
	    'yelling',
	    'yelp',
	    'yen',
	    'yesterday',
	    'yiddish',
	    'yield',
	    'yin',
	    'yippee',
	    'yo-yo',
	    'yodel',
	    'yoga',
	    'yogurt',
	    'yonder',
	    'yoyo',
	    'yummy',
	    'zap',
	    'zealous',
	    'zebra',
	    'zen',
	    'zeppelin',
	    'zero',
	    'zestfully',
	    'zesty',
	    'zigzagged',
	    'zipfile',
	    'zipping',
	    'zippy',
	    'zips',
	    'zit',
	    'zodiac',
	    'zombie',
	    'zone',
	    'zoning',
	    'zookeeper',
	    'zoologist',
	    'zoology',
	    'zoom',
	];
	return wordlist;
}

var hasRequiredNewSecureWords;

function requireNewSecureWords () {
	if (hasRequiredNewSecureWords) return newSecureWords;
	hasRequiredNewSecureWords = 1;
	Object.defineProperty(newSecureWords, "__esModule", { value: true });
	newSecureWords.newSecureWords = void 0;
	const getSecureRandom_1 = requireGetSecureRandom();
	const wordlist_1 = requireWordlist();
	async function newSecureWords$1(size = 6) {
	    let words = [];
	    for (let i = 0; i < size; i++) {
	        words.push(wordlist_1.wordlist[await (0, getSecureRandom_1.getSecureRandomNumber)(0, wordlist_1.wordlist.length)]);
	    }
	    return words;
	}
	newSecureWords.newSecureWords = newSecureWords$1;
	return newSecureWords;
}

var newSecurePassphrase = {};

var hasRequiredNewSecurePassphrase;

function requireNewSecurePassphrase () {
	if (hasRequiredNewSecurePassphrase) return newSecurePassphrase;
	hasRequiredNewSecurePassphrase = 1;
	Object.defineProperty(newSecurePassphrase, "__esModule", { value: true });
	newSecurePassphrase.newSecurePassphrase = void 0;
	const __1 = requireDist$1();
	async function newSecurePassphrase$1(size = 6) {
	    return (await (0, __1.newSecureWords)(size)).join('-');
	}
	newSecurePassphrase.newSecurePassphrase = newSecurePassphrase$1;
	return newSecurePassphrase;
}

var hasRequiredDist$1;

function requireDist$1 () {
	if (hasRequiredDist$1) return dist;
	hasRequiredDist$1 = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.newSecurePassphrase = exports.newSecureWords = exports.signVerify = exports.sign = exports.keyPairFromSecretKey = exports.keyPairFromSeed = exports.openBox = exports.sealBox = exports.mnemonicWordList = exports.mnemonicToSeed = exports.mnemonicToWalletKey = exports.mnemonicToPrivateKey = exports.mnemonicValidate = exports.mnemonicNew = exports.getSecureRandomNumber = exports.getSecureRandomWords = exports.getSecureRandomBytes = exports.hmac_sha512 = exports.pbkdf2_sha512 = exports.sha512_sync = exports.sha512 = exports.sha256_sync = exports.sha256 = void 0;
		var sha256_1 = require$$0$1;
		Object.defineProperty(exports, "sha256", { enumerable: true, get: function () { return sha256_1.sha256; } });
		Object.defineProperty(exports, "sha256_sync", { enumerable: true, get: function () { return sha256_1.sha256_sync; } });
		var sha512_1 = require$$1$2;
		Object.defineProperty(exports, "sha512", { enumerable: true, get: function () { return sha512_1.sha512; } });
		Object.defineProperty(exports, "sha512_sync", { enumerable: true, get: function () { return sha512_1.sha512_sync; } });
		var pbkdf2_sha512_1 = requirePbkdf2_sha512();
		Object.defineProperty(exports, "pbkdf2_sha512", { enumerable: true, get: function () { return pbkdf2_sha512_1.pbkdf2_sha512; } });
		var hmac_sha512_1 = require$$3;
		Object.defineProperty(exports, "hmac_sha512", { enumerable: true, get: function () { return hmac_sha512_1.hmac_sha512; } });
		var getSecureRandom_1 = requireGetSecureRandom();
		Object.defineProperty(exports, "getSecureRandomBytes", { enumerable: true, get: function () { return getSecureRandom_1.getSecureRandomBytes; } });
		Object.defineProperty(exports, "getSecureRandomWords", { enumerable: true, get: function () { return getSecureRandom_1.getSecureRandomWords; } });
		Object.defineProperty(exports, "getSecureRandomNumber", { enumerable: true, get: function () { return getSecureRandom_1.getSecureRandomNumber; } });
		var mnemonic_1 = require$$5;
		Object.defineProperty(exports, "mnemonicNew", { enumerable: true, get: function () { return mnemonic_1.mnemonicNew; } });
		Object.defineProperty(exports, "mnemonicValidate", { enumerable: true, get: function () { return mnemonic_1.mnemonicValidate; } });
		Object.defineProperty(exports, "mnemonicToPrivateKey", { enumerable: true, get: function () { return mnemonic_1.mnemonicToPrivateKey; } });
		Object.defineProperty(exports, "mnemonicToWalletKey", { enumerable: true, get: function () { return mnemonic_1.mnemonicToWalletKey; } });
		Object.defineProperty(exports, "mnemonicToSeed", { enumerable: true, get: function () { return mnemonic_1.mnemonicToSeed; } });
		var wordlist_1 = requireWordlist$1();
		Object.defineProperty(exports, "mnemonicWordList", { enumerable: true, get: function () { return wordlist_1.wordlist; } });
		var nacl_1 = require$$7;
		Object.defineProperty(exports, "sealBox", { enumerable: true, get: function () { return nacl_1.sealBox; } });
		Object.defineProperty(exports, "openBox", { enumerable: true, get: function () { return nacl_1.openBox; } });
		Object.defineProperty(exports, "keyPairFromSeed", { enumerable: true, get: function () { return nacl_1.keyPairFromSeed; } });
		var nacl_2 = require$$7;
		Object.defineProperty(exports, "keyPairFromSecretKey", { enumerable: true, get: function () { return nacl_2.keyPairFromSecretKey; } });
		Object.defineProperty(exports, "sign", { enumerable: true, get: function () { return nacl_2.sign; } });
		Object.defineProperty(exports, "signVerify", { enumerable: true, get: function () { return nacl_2.signVerify; } });
		var newSecureWords_1 = requireNewSecureWords();
		Object.defineProperty(exports, "newSecureWords", { enumerable: true, get: function () { return newSecureWords_1.newSecureWords; } });
		var newSecurePassphrase_1 = requireNewSecurePassphrase();
		Object.defineProperty(exports, "newSecurePassphrase", { enumerable: true, get: function () { return newSecurePassphrase_1.newSecurePassphrase; } });
} (dist));
	return dist;
}

var WalletV1SigningMessage = {};

var hasRequiredWalletV1SigningMessage;

function requireWalletV1SigningMessage () {
	if (hasRequiredWalletV1SigningMessage) return WalletV1SigningMessage;
	hasRequiredWalletV1SigningMessage = 1;
	Object.defineProperty(WalletV1SigningMessage, "__esModule", { value: true });
	WalletV1SigningMessage.WalletV1SigningMessage = void 0;
	const Cell_1 = require$$2$1;
	let WalletV1SigningMessage$1 = class WalletV1SigningMessage {
	    constructor(args) {
	        this.order = args.order;
	        this.sendMode = args.sendMode;
	        if (args.seqno !== undefined && args.seqno !== null) {
	            this.seqno = args.seqno;
	        }
	        else {
	            this.seqno = 0;
	        }
	    }
	    writeTo(cell) {
	        cell.bits.writeUint(this.seqno, 32);
	        cell.bits.writeUint8(this.sendMode);
	        // Write order
	        let orderCell = new Cell_1.Cell();
	        this.order.writeTo(orderCell);
	        cell.refs.push(orderCell);
	    }
	};
	WalletV1SigningMessage.WalletV1SigningMessage = WalletV1SigningMessage$1;
	return WalletV1SigningMessage;
}

var WalletV2SigningMessage = {};

var hasRequiredWalletV2SigningMessage;

function requireWalletV2SigningMessage () {
	if (hasRequiredWalletV2SigningMessage) return WalletV2SigningMessage;
	hasRequiredWalletV2SigningMessage = 1;
	Object.defineProperty(WalletV2SigningMessage, "__esModule", { value: true });
	WalletV2SigningMessage.WalletV2SigningMessage = void 0;
	const Cell_1 = require$$2$1;
	let WalletV2SigningMessage$1 = class WalletV2SigningMessage {
	    constructor(args) {
	        this.order = args.order;
	        this.sendMode = args.sendMode;
	        if (args.timeout !== undefined && args.timeout !== null) {
	            this.timeout = args.timeout;
	        }
	        else {
	            this.timeout = Math.floor(Date.now() / 1e3) + 60; // Default timeout: 60 seconds
	        }
	        if (args.seqno !== undefined && args.seqno !== null) {
	            this.seqno = args.seqno;
	        }
	        else {
	            this.seqno = 0;
	        }
	    }
	    writeTo(cell) {
	        cell.bits.writeUint(this.seqno, 32);
	        if (this.seqno === 0) {
	            for (let i = 0; i < 32; i++) {
	                cell.bits.writeBit(1);
	            }
	        }
	        else {
	            cell.bits.writeUint(this.timeout, 32);
	        }
	        cell.bits.writeUint8(this.sendMode);
	        // Write order
	        let orderCell = new Cell_1.Cell();
	        this.order.writeTo(orderCell);
	        cell.refs.push(orderCell);
	    }
	};
	WalletV2SigningMessage.WalletV2SigningMessage = WalletV2SigningMessage$1;
	return WalletV2SigningMessage;
}

var WalletV3SigningMessage = {};

var hasRequiredWalletV3SigningMessage;

function requireWalletV3SigningMessage () {
	if (hasRequiredWalletV3SigningMessage) return WalletV3SigningMessage;
	hasRequiredWalletV3SigningMessage = 1;
	Object.defineProperty(WalletV3SigningMessage, "__esModule", { value: true });
	WalletV3SigningMessage.WalletV3SigningMessage = void 0;
	const Cell_1 = require$$2$1;
	let WalletV3SigningMessage$1 = class WalletV3SigningMessage {
	    constructor(args) {
	        this.order = args.order;
	        this.sendMode = args.sendMode;
	        if (args.timeout !== undefined && args.timeout !== null) {
	            this.timeout = args.timeout;
	        }
	        else {
	            this.timeout = Math.floor(Date.now() / 1e3) + 60; // Default timeout: 60 seconds
	        }
	        if (args.seqno !== undefined && args.seqno !== null) {
	            this.seqno = args.seqno;
	        }
	        else {
	            this.seqno = 0;
	        }
	        if (args.walletId !== null && args.walletId !== undefined) {
	            this.walletId = args.walletId;
	        }
	        else {
	            this.walletId = 698983191;
	        }
	    }
	    writeTo(cell) {
	        cell.bits.writeUint(this.walletId, 32);
	        if (this.seqno === 0) {
	            for (let i = 0; i < 32; i++) {
	                cell.bits.writeBit(1);
	            }
	        }
	        else {
	            cell.bits.writeUint(this.timeout, 32);
	        }
	        cell.bits.writeUint(this.seqno, 32);
	        cell.bits.writeUint8(this.sendMode);
	        // Write order
	        let orderCell = new Cell_1.Cell();
	        this.order.writeTo(orderCell);
	        cell.refs.push(orderCell);
	    }
	};
	WalletV3SigningMessage.WalletV3SigningMessage = WalletV3SigningMessage$1;
	return WalletV3SigningMessage;
}

var hasRequiredCreateWalletTransfer;

function requireCreateWalletTransfer () {
	if (hasRequiredCreateWalletTransfer) return createWalletTransfer;
	hasRequiredCreateWalletTransfer = 1;
	Object.defineProperty(createWalletTransfer, "__esModule", { value: true });
	createWalletTransfer.createWalletTransferV3 = createWalletTransfer.createWalletTransferV2 = createWalletTransfer.createWalletTransferV1 = void 0;
	const ton_crypto_1 = requireDist$1();
	const __1 = requireDist();
	const WalletV1SigningMessage_1 = requireWalletV1SigningMessage();
	const WalletV2SigningMessage_1 = requireWalletV2SigningMessage();
	const WalletV3SigningMessage_1 = requireWalletV3SigningMessage();
	function createWalletTransferV1(args) {
	    let signingMessage = new WalletV1SigningMessage_1.WalletV1SigningMessage({
	        seqno: args.seqno,
	        sendMode: args.sendMode,
	        order: args.order
	    });
	    // Sign message
	    const cell = new __1.Cell();
	    signingMessage.writeTo(cell);
	    let signature = (0, ton_crypto_1.sign)(cell.hash(), args.secretKey);
	    // Body
	    const body = new __1.Cell();
	    body.bits.writeBuffer(signature);
	    signingMessage.writeTo(body);
	    return body;
	}
	createWalletTransfer.createWalletTransferV1 = createWalletTransferV1;
	function createWalletTransferV2(args) {
	    let signingMessage = new WalletV2SigningMessage_1.WalletV2SigningMessage({
	        seqno: args.seqno,
	        sendMode: args.sendMode,
	        order: args.order,
	        timeout: args.timeout
	    });
	    // Sign message
	    const cell = new __1.Cell();
	    signingMessage.writeTo(cell);
	    let signature = (0, ton_crypto_1.sign)(cell.hash(), args.secretKey);
	    // Body
	    const body = new __1.Cell();
	    body.bits.writeBuffer(signature);
	    signingMessage.writeTo(body);
	    return body;
	}
	createWalletTransfer.createWalletTransferV2 = createWalletTransferV2;
	function createWalletTransferV3(args) {
	    let signingMessage = new WalletV3SigningMessage_1.WalletV3SigningMessage({
	        timeout: args.timeout,
	        walletId: args.walletId,
	        seqno: args.seqno,
	        sendMode: args.sendMode,
	        order: args.order
	    });
	    // Sign message
	    const cell = new __1.Cell();
	    signingMessage.writeTo(cell);
	    let signature = (0, ton_crypto_1.sign)(cell.hash(), args.secretKey);
	    // Body
	    const body = new __1.Cell();
	    body.bits.writeBuffer(signature);
	    signingMessage.writeTo(body);
	    return body;
	}
	createWalletTransfer.createWalletTransferV3 = createWalletTransferV3;
	return createWalletTransfer;
}

var contractAddress = {};

var hasRequiredContractAddress;

function requireContractAddress () {
	if (hasRequiredContractAddress) return contractAddress;
	hasRequiredContractAddress = 1;
	Object.defineProperty(contractAddress, "__esModule", { value: true });
	contractAddress.contractAddress = void 0;
	const __1 = requireDist();
	function contractAddress$1(source) {
	    let cell = new __1.Cell();
	    let state = new __1.StateInit({ code: source.initialCode, data: source.initialData });
	    state.writeTo(cell);
	    let hash = cell.hash();
	    return new __1.Address(source.workchain, hash);
	}
	contractAddress.contractAddress = contractAddress$1;
	return contractAddress;
}

var hasRequiredWalletContract;

function requireWalletContract () {
	if (hasRequiredWalletContract) return WalletContract;
	hasRequiredWalletContract = 1;
	Object.defineProperty(WalletContract, "__esModule", { value: true });
	WalletContract.WalletContract = void 0;
	const createWalletTransfer_1 = requireCreateWalletTransfer();
	const contractAddress_1 = requireContractAddress();
	let WalletContract$1 = class WalletContract {
	    constructor(client, source, address) {
	        this.client = client;
	        this.address = address;
	        this.source = source;
	    }
	    static create(client, source) {
	        let address = (0, contractAddress_1.contractAddress)(source);
	        return new WalletContract$1(client, source, address);
	    }
	    async getSeqNo() {
	        if (await this.client.isContractDeployed(this.address)) {
	            let res = await this.client.callGetMethod(this.address, 'seqno');
	            return parseInt(res.stack[0][1], 16);
	        }
	        else {
	            return 0;
	        }
	    }
	    createTransfer(args) {
	        switch (this.source.walletVersion) {
	            case 'v1':
	                return (0, createWalletTransfer_1.createWalletTransferV1)({ seqno: args.seqno, sendMode: args.sendMode, secretKey: args.secretKey, order: args.order });
	            case 'v2':
	                return (0, createWalletTransfer_1.createWalletTransferV2)({ seqno: args.seqno, sendMode: args.sendMode, secretKey: args.secretKey, order: args.order, timeout: args.timeout });
	            case 'v3':
	                return (0, createWalletTransfer_1.createWalletTransferV3)({ seqno: args.seqno, sendMode: args.sendMode, secretKey: args.secretKey, order: args.order, walletId: this.source.walletId, timeout: args.timeout });
	            default:
	                throw Error('Unknown contract type: ' + this.source.type);
	        }
	    }
	};
	WalletContract.WalletContract = WalletContract$1;
	return WalletContract;
}

var UnknownContractSource$1 = {};

Object.defineProperty(UnknownContractSource$1, "__esModule", { value: true });
UnknownContractSource$1.UnknownContractSource = void 0;
class UnknownContractSource {
    constructor(type, workchain, description) {
        this.backup = () => {
            throw Error('Unknown');
        };
        this.describe = () => {
            return this.description;
        };
        this.type = type;
        this.workchain = workchain;
        this.description = description;
    }
    get initialCode() {
        throw Error('Unknown');
    }
    get initialData() {
        throw Error('Unknown');
    }
}
UnknownContractSource$1.UnknownContractSource = UnknownContractSource;

var WalletV1R1Source = {};

var hasRequiredWalletV1R1Source;

function requireWalletV1R1Source () {
	if (hasRequiredWalletV1R1Source) return WalletV1R1Source;
	hasRequiredWalletV1R1Source = 1;
	Object.defineProperty(WalletV1R1Source, "__esModule", { value: true });
	WalletV1R1Source.WalletV1R1Source = void 0;
	const __1 = requireDist();
	let WalletV1R1Source$1 = class WalletV1R1Source {
	    constructor(opts) {
	        this.type = 'org.ton.wallets.simple';
	        this.walletVersion = 'v1';
	        this.backup = () => {
	            const store = new __1.ConfigStore();
	            store.setInt('wc', this.workchain);
	            store.setBuffer('pk', this.publicKey);
	            return store.save();
	        };
	        this.describe = () => {
	            return 'Simple Wallet Contract';
	        };
	        this.publicKey = opts.publicKey;
	        this.initialCode = opts.initialCode;
	        this.initialData = opts.initialData;
	        this.workchain = opts.workchain;
	        Object.freeze(this);
	    }
	    static create(opts) {
	        // Resolve parameters
	        let publicKey = opts.publicKey;
	        let workchain = opts.workchain;
	        // Build initial code and data
	        let initialCode = __1.Cell.fromBoc('B5EE9C72410101010044000084FF0020DDA4F260810200D71820D70B1FED44D0D31FD3FFD15112BAF2A122F901541044F910F2A2F80001D31F3120D74A96D307D402FB00DED1A4C8CB1FCBFFC9ED5441FDF089')[0];
	        let initialData = new __1.Cell();
	        initialData.bits.writeUint(0, 32); // SeqNo
	        initialData.bits.writeBuffer(publicKey); // Public key
	        return new WalletV1R1Source$1({ publicKey, initialCode, initialData, workchain });
	    }
	    static restore(backup) {
	        const store = new __1.ConfigStore(backup);
	        return WalletV1R1Source$1.create({ publicKey: store.getBuffer('pk'), workchain: store.getInt('wc') });
	    }
	};
	WalletV1R1Source.WalletV1R1Source = WalletV1R1Source$1;
	return WalletV1R1Source;
}

var WalletV1R2Source = {};

var hasRequiredWalletV1R2Source;

function requireWalletV1R2Source () {
	if (hasRequiredWalletV1R2Source) return WalletV1R2Source;
	hasRequiredWalletV1R2Source = 1;
	Object.defineProperty(WalletV1R2Source, "__esModule", { value: true });
	WalletV1R2Source.WalletV1R2Source = void 0;
	const __1 = requireDist();
	let WalletV1R2Source$1 = class WalletV1R2Source {
	    constructor(opts) {
	        this.type = 'org.ton.wallets.simple.r2';
	        this.walletVersion = 'v1';
	        this.backup = () => {
	            const store = new __1.ConfigStore();
	            store.setInt('wc', this.workchain);
	            store.setBuffer('pk', this.publicKey);
	            return store.save();
	        };
	        this.describe = () => {
	            return 'Simple Wallet Contract (R2)';
	        };
	        this.publicKey = opts.publicKey;
	        this.initialCode = opts.initialCode;
	        this.initialData = opts.initialData;
	        this.workchain = opts.workchain;
	        Object.freeze(this);
	    }
	    static create(opts) {
	        // Resolve parameters
	        let publicKey = opts.publicKey;
	        let workchain = opts.workchain;
	        // Build initial code and data
	        let initialCode = __1.Cell.fromBoc('B5EE9C724101010100530000A2FF0020DD2082014C97BA9730ED44D0D70B1FE0A4F260810200D71820D70B1FED44D0D31FD3FFD15112BAF2A122F901541044F910F2A2F80001D31F3120D74A96D307D402FB00DED1A4C8CB1FCBFFC9ED54D0E2786F')[0];
	        let initialData = new __1.Cell();
	        initialData.bits.writeUint(0, 32); // SeqNo
	        initialData.bits.writeBuffer(publicKey); // Public key
	        return new WalletV1R2Source$1({ publicKey, initialCode, initialData, workchain });
	    }
	    static restore(backup) {
	        const store = new __1.ConfigStore(backup);
	        return WalletV1R2Source$1.create({ publicKey: store.getBuffer('pk'), workchain: store.getInt('wc') });
	    }
	};
	WalletV1R2Source.WalletV1R2Source = WalletV1R2Source$1;
	return WalletV1R2Source;
}

var WalletV1R3Source = {};

var hasRequiredWalletV1R3Source;

function requireWalletV1R3Source () {
	if (hasRequiredWalletV1R3Source) return WalletV1R3Source;
	hasRequiredWalletV1R3Source = 1;
	Object.defineProperty(WalletV1R3Source, "__esModule", { value: true });
	WalletV1R3Source.WalletV1R3Source = void 0;
	const __1 = requireDist();
	let WalletV1R3Source$1 = class WalletV1R3Source {
	    constructor(opts) {
	        this.type = 'org.ton.wallets.simple.r3';
	        this.walletVersion = 'v1';
	        this.backup = () => {
	            const store = new __1.ConfigStore();
	            store.setInt('wc', this.workchain);
	            store.setBuffer('pk', this.publicKey);
	            return store.save();
	        };
	        this.describe = () => {
	            return 'Simple Wallet Contract (R3)';
	        };
	        this.publicKey = opts.publicKey;
	        this.initialCode = opts.initialCode;
	        this.initialData = opts.initialData;
	        this.workchain = opts.workchain;
	        Object.freeze(this);
	    }
	    static create(opts) {
	        // Resolve parameters
	        let publicKey = opts.publicKey;
	        let workchain = opts.workchain;
	        // Build initial code and data
	        let initialCode = __1.Cell.fromBoc('B5EE9C7241010101005F0000BAFF0020DD2082014C97BA218201339CBAB19C71B0ED44D0D31FD70BFFE304E0A4F260810200D71820D70B1FED44D0D31FD3FFD15112BAF2A122F901541044F910F2A2F80001D31F3120D74A96D307D402FB00DED1A4C8CB1FCBFFC9ED54B5B86E42')[0];
	        let initialData = new __1.Cell();
	        initialData.bits.writeUint(0, 32); // SeqNo
	        initialData.bits.writeBuffer(publicKey); // Public key
	        return new WalletV1R3Source$1({ publicKey, initialCode, initialData, workchain });
	    }
	    static restore(backup) {
	        const store = new __1.ConfigStore(backup);
	        return WalletV1R3Source$1.create({ publicKey: store.getBuffer('pk'), workchain: store.getInt('wc') });
	    }
	};
	WalletV1R3Source.WalletV1R3Source = WalletV1R3Source$1;
	return WalletV1R3Source;
}

var WalletV2R1Source = {};

var hasRequiredWalletV2R1Source;

function requireWalletV2R1Source () {
	if (hasRequiredWalletV2R1Source) return WalletV2R1Source;
	hasRequiredWalletV2R1Source = 1;
	Object.defineProperty(WalletV2R1Source, "__esModule", { value: true });
	WalletV2R1Source.WalletV2R1Source = void 0;
	const __1 = requireDist();
	let WalletV2R1Source$1 = class WalletV2R1Source {
	    constructor(opts) {
	        this.type = 'org.ton.wallets.v2';
	        this.walletVersion = 'v2';
	        this.backup = () => {
	            const store = new __1.ConfigStore();
	            store.setInt('wc', this.workchain);
	            store.setBuffer('pk', this.publicKey);
	            return store.save();
	        };
	        this.describe = () => {
	            return 'Wallet V2 Contract';
	        };
	        this.publicKey = opts.publicKey;
	        this.initialCode = opts.initialCode;
	        this.initialData = opts.initialData;
	        this.workchain = opts.workchain;
	        Object.freeze(this);
	    }
	    static create(opts) {
	        // Resolve parameters
	        let publicKey = opts.publicKey;
	        let workchain = opts.workchain;
	        // Build initial code and data
	        let initialCode = __1.Cell.fromBoc('B5EE9C724101010100570000AAFF0020DD2082014C97BA9730ED44D0D70B1FE0A4F2608308D71820D31FD31F01F823BBF263ED44D0D31FD3FFD15131BAF2A103F901541042F910F2A2F800029320D74A96D307D402FB00E8D1A4C8CB1FCBFFC9ED54A1370BB6')[0];
	        let initialData = new __1.Cell();
	        initialData.bits.writeUint(0, 32); // SeqNo
	        initialData.bits.writeBuffer(publicKey); // Public key
	        return new WalletV2R1Source$1({ publicKey, initialCode, initialData, workchain });
	    }
	    static restore(backup) {
	        const store = new __1.ConfigStore(backup);
	        return WalletV2R1Source$1.create({ publicKey: store.getBuffer('pk'), workchain: store.getInt('wc') });
	    }
	};
	WalletV2R1Source.WalletV2R1Source = WalletV2R1Source$1;
	return WalletV2R1Source;
}

var WalletV2R2Source = {};

var hasRequiredWalletV2R2Source;

function requireWalletV2R2Source () {
	if (hasRequiredWalletV2R2Source) return WalletV2R2Source;
	hasRequiredWalletV2R2Source = 1;
	Object.defineProperty(WalletV2R2Source, "__esModule", { value: true });
	WalletV2R2Source.WalletV2R2Source = void 0;
	const __1 = requireDist();
	let WalletV2R2Source$1 = class WalletV2R2Source {
	    constructor(opts) {
	        this.type = 'org.ton.wallets.v2.r2';
	        this.walletVersion = 'v2';
	        this.backup = () => {
	            const store = new __1.ConfigStore();
	            store.setInt('wc', this.workchain);
	            store.setBuffer('pk', this.publicKey);
	            return store.save();
	        };
	        this.describe = () => {
	            return 'Wallet V2 Contract (R2)';
	        };
	        this.publicKey = opts.publicKey;
	        this.workchain = opts.workchain;
	        this.initialCode = opts.initialCode;
	        this.initialData = opts.initialData;
	        Object.freeze(this);
	    }
	    static create(opts) {
	        // Resolve parameters
	        let publicKey = opts.publicKey;
	        let workchain = opts.workchain;
	        // Build initial code and data
	        let initialCode = __1.Cell.fromBoc('B5EE9C724101010100630000C2FF0020DD2082014C97BA218201339CBAB19C71B0ED44D0D31FD70BFFE304E0A4F2608308D71820D31FD31F01F823BBF263ED44D0D31FD3FFD15131BAF2A103F901541042F910F2A2F800029320D74A96D307D402FB00E8D1A4C8CB1FCBFFC9ED54044CD7A1')[0];
	        let initialData = new __1.Cell();
	        initialData.bits.writeUint(0, 32); // SeqNo
	        initialData.bits.writeBuffer(publicKey); // Public key
	        return new WalletV2R2Source$1({ publicKey, initialCode, initialData, workchain });
	    }
	    static restore(backup) {
	        const store = new __1.ConfigStore(backup);
	        return WalletV2R2Source$1.create({ publicKey: store.getBuffer('pk'), workchain: store.getInt('wc') });
	    }
	};
	WalletV2R2Source.WalletV2R2Source = WalletV2R2Source$1;
	return WalletV2R2Source;
}

var WalletV3R1Source = {};

var hasRequiredWalletV3R1Source;

function requireWalletV3R1Source () {
	if (hasRequiredWalletV3R1Source) return WalletV3R1Source;
	hasRequiredWalletV3R1Source = 1;
	Object.defineProperty(WalletV3R1Source, "__esModule", { value: true });
	WalletV3R1Source.WalletV3R1Source = void 0;
	const __1 = requireDist();
	let WalletV3R1Source$1 = class WalletV3R1Source {
	    constructor(opts) {
	        this.type = 'org.ton.wallets.v3';
	        this.walletVersion = 'v3';
	        this.backup = () => {
	            const store = new __1.ConfigStore();
	            store.setInt('wc', this.workchain);
	            store.setInt('walletId', this.walletId);
	            store.setBuffer('pk', this.publicKey);
	            return store.save();
	        };
	        this.describe = () => {
	            return `Wallet V3 Contract. WalletID = ${this.walletId}`;
	        };
	        this.publicKey = opts.publicKey;
	        this.workchain = opts.workchain;
	        this.walletId = opts.walletId;
	        this.initialCode = opts.initialCode;
	        this.initialData = opts.initialData;
	        Object.freeze(this);
	    }
	    static create(opts) {
	        // Resolve parameters
	        let publicKey = opts.publicKey;
	        let workchain = opts.workchain;
	        let walletId;
	        if (opts.walletId !== null && opts.walletId !== undefined) {
	            walletId = opts.walletId;
	        }
	        else {
	            walletId = 698983191 + workchain;
	        }
	        // Build initial code and data
	        let initialCode = __1.Cell.fromBoc('B5EE9C724101010100620000C0FF0020DD2082014C97BA9730ED44D0D70B1FE0A4F2608308D71820D31FD31FD31FF82313BBF263ED44D0D31FD31FD3FFD15132BAF2A15144BAF2A204F901541055F910F2A3F8009320D74A96D307D402FB00E8D101A4C8CB1FCB1FCBFFC9ED543FBE6EE0')[0];
	        let initialData = new __1.Cell();
	        initialData.bits.writeUint(0, 32);
	        initialData.bits.writeUint(walletId, 32);
	        initialData.bits.writeBuffer(publicKey);
	        // Build contract source
	        return new WalletV3R1Source$1({
	            publicKey,
	            workchain,
	            walletId,
	            initialCode,
	            initialData
	        });
	    }
	    static restore(backup) {
	        const store = new __1.ConfigStore(backup);
	        return WalletV3R1Source$1.create({ publicKey: store.getBuffer('pk'), workchain: store.getInt('wc'), walletId: store.getInt('walletId') });
	    }
	};
	WalletV3R1Source.WalletV3R1Source = WalletV3R1Source$1;
	return WalletV3R1Source;
}

var WalletV3R2Source = {};

var hasRequiredWalletV3R2Source;

function requireWalletV3R2Source () {
	if (hasRequiredWalletV3R2Source) return WalletV3R2Source;
	hasRequiredWalletV3R2Source = 1;
	Object.defineProperty(WalletV3R2Source, "__esModule", { value: true });
	WalletV3R2Source.WalletV3R2Source = void 0;
	const __1 = requireDist();
	let WalletV3R2Source$1 = class WalletV3R2Source {
	    constructor(opts) {
	        this.type = 'org.ton.wallets.v3.r2';
	        this.walletVersion = 'v3';
	        this.backup = () => {
	            const store = new __1.ConfigStore();
	            store.setInt('wc', this.workchain);
	            store.setInt('walletId', this.walletId);
	            store.setBuffer('pk', this.publicKey);
	            return store.save();
	        };
	        this.describe = () => {
	            return `Wallet V3 Contract (R2). WalletID = ${this.walletId}`;
	        };
	        this.publicKey = opts.publicKey;
	        this.workchain = opts.workchain;
	        this.walletId = opts.walletId;
	        this.initialCode = opts.initialCode;
	        this.initialData = opts.initialData;
	        Object.freeze(this);
	    }
	    static create(opts) {
	        // Resolve parameters
	        let publicKey = opts.publicKey;
	        let workchain = opts.workchain;
	        let walletId;
	        if (opts.walletId !== null && opts.walletId !== undefined) {
	            walletId = opts.walletId;
	        }
	        else {
	            walletId = 698983191 + workchain;
	        }
	        // Build initial code and data
	        let initialCode = __1.Cell.fromBoc('B5EE9C724101010100710000DEFF0020DD2082014C97BA218201339CBAB19F71B0ED44D0D31FD31F31D70BFFE304E0A4F2608308D71820D31FD31FD31FF82313BBF263ED44D0D31FD31FD3FFD15132BAF2A15144BAF2A204F901541055F910F2A3F8009320D74A96D307D402FB00E8D101A4C8CB1FCB1FCBFFC9ED5410BD6DAD')[0];
	        let initialData = new __1.Cell();
	        initialData.bits.writeUint(0, 32);
	        initialData.bits.writeUint(walletId, 32);
	        initialData.bits.writeBuffer(publicKey);
	        // Build contract source
	        return new WalletV3R2Source$1({
	            publicKey,
	            workchain,
	            walletId,
	            initialCode,
	            initialData
	        });
	    }
	    static restore(backup) {
	        const store = new __1.ConfigStore(backup);
	        return WalletV3R2Source$1.create({ publicKey: store.getBuffer('pk'), workchain: store.getInt('wc'), walletId: store.getInt('walletId') });
	    }
	};
	WalletV3R2Source.WalletV3R2Source = WalletV3R2Source$1;
	return WalletV3R2Source;
}

var __classPrivateFieldGet = (undefined && undefined.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ConfigStore_map;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigStore = void 0;
const __1 = require("..");
class ConfigStore {
    constructor(source) {
        _ConfigStore_map.set(this, new Map());
        this.getString = (key) => {
            let ex = __classPrivateFieldGet(this, _ConfigStore_map, "f").get(key);
            if (!ex) {
                throw Error('Unable to find key ' + key);
            }
            return ex;
        };
        this.getBuffer = (key) => {
            return Buffer.from(this.getString(key), 'hex');
        };
        this.getAddress = (key) => {
            return __1.Address.parseFriendly(this.getString(key)).address;
        };
        this.getInt = (key) => {
            return parseInt(this.getString(key));
        };
        this.setBuffer = (key, value) => {
            this.setString(key, value.toString('hex'));
        };
        this.setAddress = (key, address) => {
            this.setString(key, address.toFriendly());
        };
        if (source) {
            let parts = source.split(',');
            for (let p of parts) {
                let pp = p.split('=');
                if (pp.length !== 2) {
                    throw Error('Mailformed input');
                }
                if (__classPrivateFieldGet(this, _ConfigStore_map, "f").has(pp[0])) {
                    throw Error('Mailformed input');
                }
                __classPrivateFieldGet(this, _ConfigStore_map, "f").set(pp[0], pp[1]);
            }
        }
    }
    setString(key, value) {
        if (key.indexOf('=') >= 0 || key.indexOf(',') >= 0) {
            throw Error('Mailformed input');
        }
        if (value.indexOf('=') >= 0 || value.indexOf(',') >= 0) {
            throw Error('Mailformed input');
        }
        __classPrivateFieldGet(this, _ConfigStore_map, "f").set(key, value);
    }
    setInt(key, value) {
        this.setString(key, value.toString(10));
    }
    save() {
        let res = '';
        for (let e of __classPrivateFieldGet(this, _ConfigStore_map, "f")) {
            if (res !== '') {
                res += ',';
            }
            res += e[0] + '=' + e[1];
        }
        return res;
    }
}
exports.ConfigStore = ConfigStore;
_ConfigStore_map = new WeakMap();

var ConfigStore$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$39 = /*@__PURE__*/getAugmentedNamespace(ConfigStore$1);

var parseDict$1 = {};

Object.defineProperty(parseDict$1, "__esModule", { value: true });
parseDict$1.parseDictRefs = parseDict$1.parseDictBitString = parseDict$1.parseDict = void 0;
const bn_js_1$1 = bn.exports;
function doParse(prefix, slice, n, res, extractor) {
    // Reading label
    let lb0 = slice.readBit() ? 1 : 0;
    let prefixLength = 0;
    let pp = prefix;
    if (lb0 === 0) {
        // Short label detected
        // Read 
        prefixLength = slice.readUnaryLength();
        // Read prefix
        for (let i = 0; i < prefixLength; i++) {
            pp += slice.readBit() ? '1' : '0';
        }
    }
    else {
        let lb1 = slice.readBit() ? 1 : 0;
        if (lb1 === 0) {
            // Long label detected
            prefixLength = slice.readUintNumber(Math.ceil(Math.log2(n + 1)));
            for (let i = 0; i < prefixLength; i++) {
                pp += slice.readBit() ? '1' : '0';
            }
        }
        else {
            // Same label detected
            let bit = slice.readBit() ? '1' : '0';
            prefixLength = slice.readUintNumber(Math.ceil(Math.log2(n + 1)));
            for (let i = 0; i < prefixLength; i++) {
                pp += bit;
            }
        }
    }
    if (n - prefixLength === 0) {
        res.set(new bn_js_1$1.BN(pp, 2).toString(10), extractor(slice));
    }
    else {
        let left = slice.readRef();
        let right = slice.readRef();
        // NOTE: Left and right branches are implicitly contain prefixes '0' and '1'
        doParse(pp + '0', left, n - prefixLength - 1, res, extractor);
        doParse(pp + '1', right, n - prefixLength - 1, res, extractor);
    }
}
function parseDict(slice, keySize, extractor) {
    let res = new Map();
    doParse('', slice, keySize, res, extractor);
    return res;
}
parseDict$1.parseDict = parseDict;
function parseDictBitString(slice, keySize) {
    let res = new Map();
    doParse('', slice, keySize, res, (slice) => slice.readRemaining());
    return res;
}
parseDict$1.parseDictBitString = parseDictBitString;
function parseDictRefs(slice, keySize) {
    let res = new Map();
    doParse('', slice, keySize, res, (slice) => slice.readRef());
    return res;
}
parseDict$1.parseDictRefs = parseDictRefs;

var serializeDict$1 = {};

var findCommonPrefix$1 = {};

Object.defineProperty(findCommonPrefix$1, "__esModule", { value: true });
findCommonPrefix$1.findCommonPrefix = void 0;
function findCommonPrefix(src) {
    // Corner cases
    if (src.length === 0) {
        return '';
    }
    if (src.length === 1) {
        return src[0];
    }
    // Searching for prefix
    const sorted = [...src].sort();
    let size = 0;
    for (let i = 0; i < sorted[0].length; i++) {
        if (sorted[0][i] !== sorted[sorted.length - 1][i]) {
            break;
        }
        size++;
    }
    return src[0].slice(0, size);
}
findCommonPrefix$1.findCommonPrefix = findCommonPrefix;

Object.defineProperty(serializeDict$1, "__esModule", { value: true });
serializeDict$1.serializeDict = serializeDict$1.detectLabelType = serializeDict$1.writeLabelSame = serializeDict$1.writeLabelLong = serializeDict$1.writeLabelShort = serializeDict$1.buildTree = void 0;
const bn_js_1 = bn.exports;
const Cell_1 = require$$2$1;
const findCommonPrefix_1 = findCommonPrefix$1;
//
// Tree Build
//
function pad(src, size) {
    while (src.length < size) {
        src = '0' + src;
    }
    return src;
}
function removePrefixMap(src, length) {
    if (length === 0) {
        return src;
    }
    else {
        let res = new Map();
        for (let k of src.keys()) {
            let d = src.get(k);
            res.set(k.slice(length), d);
        }
        return res;
    }
}
function forkMap(src) {
    if (src.size === 0) {
        throw Error('Internal inconsistency');
    }
    let left = new Map();
    let right = new Map();
    for (let k of src.keys()) {
        let d = src.get(k);
        if (k.startsWith('0')) {
            left.set(k.substr(1), d);
        }
        else {
            right.set(k.substr(1), d);
        }
    }
    if (left.size === 0) {
        throw Error('Internal inconsistency. Left emtpy.');
    }
    if (right.size === 0) {
        throw Error('Internal inconsistency. Right emtpy.');
    }
    return { left, right };
}
function buildNode(src) {
    if (src.size === 0) {
        throw Error('Internal inconsistency');
    }
    if (src.size === 1) {
        return { type: 'leaf', value: Array.from(src.values())[0] };
    }
    let { left, right } = forkMap(src);
    return {
        type: 'fork',
        left: buildEdge(left),
        right: buildEdge(right)
    };
}
function buildEdge(src) {
    if (src.size === 0) {
        throw Error('Internal inconsistency');
    }
    const label = (0, findCommonPrefix_1.findCommonPrefix)(Array.from(src.keys()));
    return { label, node: buildNode(removePrefixMap(src, label.length)) };
}
function buildTree(src, keyLength) {
    // Convert map keys
    let converted = new Map();
    for (let k of Array.from(src.keys())) {
        const padded = pad(new bn_js_1.BN(k).toString(2), keyLength);
        converted.set(padded, src.get(k));
    }
    // Calculate root label
    return buildEdge(converted);
}
serializeDict$1.buildTree = buildTree;
//
// Serialization
//
function writeLabelShort(src, to) {
    // Header
    to.writeBit(0);
    // Unary length
    for (let i = 0; i < src.length; i++) {
        to.writeBit(1);
    }
    to.writeBit(0);
    // Value
    for (let i = 0; i < src.length; i++) {
        to.writeBit(src[i] === '1');
    }
    return to;
}
serializeDict$1.writeLabelShort = writeLabelShort;
function labelShortLength(src) {
    return 1 + src.length + 1 + src.length;
}
function writeLabelLong(src, keyLength, to) {
    // Header
    to.writeBit(1);
    to.writeBit(0);
    // Length
    let length = Math.ceil(Math.log2(keyLength + 1));
    to.writeUint(src.length, length);
    // Value
    for (let i = 0; i < src.length; i++) {
        to.writeBit(src[i] === '1');
    }
    return to;
}
serializeDict$1.writeLabelLong = writeLabelLong;
function labelLongLength(src, keyLength) {
    return 1 + 1 + Math.ceil(Math.log2(keyLength + 1)) + src.length;
}
function writeLabelSame(value, length, keyLength, to) {
    // Header
    to.writeBit(1);
    to.writeBit(1);
    // Value
    to.writeBit(value);
    // Length
    let lenLen = Math.ceil(Math.log2(keyLength + 1));
    to.writeUint(length, lenLen);
}
serializeDict$1.writeLabelSame = writeLabelSame;
function labelSameLength(keyLength) {
    return 1 + 1 + 1 + Math.ceil(Math.log2(keyLength + 1));
}
function isSame(src) {
    if (src.length === 0 || src.length === 1) {
        return true;
    }
    for (let i = 1; i < src.length; i++) {
        if (src[i] !== src[0]) {
            return false;
        }
    }
    return true;
}
function detectLabelType(src, keyLength) {
    let kind = 'short';
    let kindLength = labelShortLength(src);
    let longLength = labelLongLength(src, keyLength);
    if (longLength < kindLength) {
        kindLength = longLength;
        kind = 'long';
    }
    if (isSame(src)) {
        let sameLength = labelSameLength(keyLength);
        if (sameLength < kindLength) {
            kindLength = sameLength;
            kind = 'same';
        }
    }
    return kind;
}
serializeDict$1.detectLabelType = detectLabelType;
function writeLabel(src, keyLength, to) {
    let type = detectLabelType(src, keyLength);
    if (type === 'short') {
        writeLabelShort(src, to);
    }
    if (type === 'long') {
        writeLabelLong(src, keyLength, to);
    }
    if (type === 'same') {
        writeLabelSame(src[0] === '1', src.length, keyLength, to);
    }
}
function writeNode(src, keyLength, serializer, to) {
    if (src.type === 'leaf') {
        serializer(src.value, to);
    }
    if (src.type === 'fork') {
        const leftCell = new Cell_1.Cell();
        const rightCell = new Cell_1.Cell();
        writeEdge(src.left, keyLength - 1, serializer, leftCell);
        writeEdge(src.right, keyLength - 1, serializer, rightCell);
        to.refs.push(leftCell);
        to.refs.push(rightCell);
    }
}
function writeEdge(src, keyLength, serializer, to) {
    writeLabel(src.label, keyLength, to.bits);
    writeNode(src.node, keyLength - src.label.length, serializer, to);
}
function serializeDict(src, keyLength, serializer) {
    const tree = buildTree(src, keyLength);
    const dest = new Cell_1.Cell();
    writeEdge(tree, keyLength, serializer, dest);
    return dest;
}
serializeDict$1.serializeDict = serializeDict;

Object.defineProperty(exports, "__esModule", { value: true });
exports.safeSignVerify = exports.safeSign = void 0;
const ton_crypto_1 = require("ton-crypto");
function createSafeSignHash(cell) {
    return (0, ton_crypto_1.sha256_sync)(Buffer.concat([Buffer.from([0xff, 0xff]), Buffer.from('ton-safe-sign-magic'), cell.hash()]));
}
function safeSign(cell, secretKey) {
    return (0, ton_crypto_1.sign)(createSafeSignHash(cell), secretKey);
}
exports.safeSign = safeSign;
function safeSignVerify(cell, signature, publicKey) {
    return (0, ton_crypto_1.signVerify)(createSafeSignHash(cell), signature, publicKey);
}
exports.safeSignVerify = safeSignVerify;

var safeSign$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$42 = /*@__PURE__*/getAugmentedNamespace(safeSign$1);

var parseTransaction = {};

var hasRequiredParseTransaction;

function requireParseTransaction () {
	if (hasRequiredParseTransaction) return parseTransaction;
	hasRequiredParseTransaction = 1;
	Object.defineProperty(parseTransaction, "__esModule", { value: true });
	parseTransaction.parseTransaction = parseTransaction.parseTransactionDescription = parseTransaction.parseBouncePhase = parseTransaction.parseActionPhase = parseTransaction.parseComputePhase = parseTransaction.parseCreditPhase = parseTransaction.parseStoragePhase = parseTransaction.parseStorageUsedShort = parseTransaction.parseAccountChange = parseTransaction.parseHashUpdate = parseTransaction.parseMessage = parseTransaction.parseStateInit = parseTransaction.parseCommonMsgInfo = parseTransaction.parseCurrencyCollection = parseTransaction.parseAccountStatus = void 0;
	const __1 = requireDist();
	function parseAccountStatus(slice) {
	    const status = slice.readUintNumber(2);
	    if (status === 0x00) {
	        return 'uninitialized';
	    }
	    if (status === 0x01) {
	        return 'frozen';
	    }
	    if (status === 0x02) {
	        return 'active';
	    }
	    if (status === 0x03) {
	        return 'non-existing';
	    }
	    throw Error('Unreachable');
	}
	parseTransaction.parseAccountStatus = parseAccountStatus;
	function parseCurrencyCollection(slice) {
	    const coins = slice.readCoins();
	    if (slice.readBit()) {
	        throw Error('Currency collctions are not supported yet');
	    }
	    return { coins };
	}
	parseTransaction.parseCurrencyCollection = parseCurrencyCollection;
	function parseCommonMsgInfo(slice) {
	    if (!slice.readBit()) {
	        // Internal
	        let ihrDisabled = slice.readBit();
	        let bounce = slice.readBit();
	        let bounced = slice.readBit();
	        let src = slice.readAddress();
	        let dest = slice.readAddress();
	        let value = parseCurrencyCollection(slice);
	        let ihrFee = slice.readCoins();
	        let fwdFee = slice.readCoins();
	        let createdLt = slice.readUint(64);
	        let createdAt = slice.readUintNumber(32);
	        return {
	            type: 'internal',
	            ihrDisabled,
	            bounce,
	            bounced,
	            src,
	            dest,
	            value,
	            ihrFee,
	            fwdFee,
	            createdLt,
	            createdAt
	        };
	    }
	    else if (slice.readBit()) {
	        // Outgoing external
	        let src = slice.readAddress();
	        let dest = slice.readAddress();
	        let createdLt = slice.readUint(64);
	        let createdAt = slice.readUintNumber(32);
	        return {
	            type: 'external-out',
	            src,
	            dest,
	            createdLt,
	            createdAt
	        };
	    }
	    else {
	        // Incoming external
	        let src = slice.readAddress();
	        let dest = slice.readAddress();
	        let importFee = slice.readCoins();
	        return {
	            type: 'external-in',
	            src,
	            dest,
	            importFee
	        };
	    }
	}
	parseTransaction.parseCommonMsgInfo = parseCommonMsgInfo;
	function parseStateInit(slice) {
	    if (slice.readBit()) {
	        throw Error('Unsupported');
	    }
	    if (slice.readBit()) {
	        throw Error('Unsupported');
	    }
	    const hasCode = slice.readBit();
	    const code = hasCode ? slice.readCell() : null;
	    const hasData = slice.readBit();
	    const data = hasData ? slice.readCell() : null;
	    if (slice.readBit()) {
	        throw Error('Unsupported');
	    }
	    return { data, code };
	}
	parseTransaction.parseStateInit = parseStateInit;
	function parseMessage(slice) {
	    const info = parseCommonMsgInfo(slice);
	    const hasInit = slice.readBit();
	    let init = null;
	    if (hasInit) {
	        if (!slice.readBit()) {
	            init = parseStateInit(slice);
	        }
	        else {
	            init = parseStateInit(slice.readRef());
	        }
	    }
	    const body = slice.readBit() ? slice.readRef().toCell() : slice.toCell();
	    return {
	        info,
	        init,
	        body
	    };
	}
	parseTransaction.parseMessage = parseMessage;
	function parseHashUpdate(slice) {
	    if (slice.readUintNumber(8) !== 0x72) {
	        throw Error('Invalid transaction');
	    }
	    const oldHash = slice.readBuffer(32);
	    const newHash = slice.readBuffer(32);
	    return { oldHash, newHash };
	}
	parseTransaction.parseHashUpdate = parseHashUpdate;
	function parseAccountChange(slice) {
	    if (!slice.readBit()) {
	        return 'unchanged';
	    }
	    if (slice.readBit()) {
	        return 'frozen';
	    }
	    else {
	        return 'deleted';
	    }
	}
	parseTransaction.parseAccountChange = parseAccountChange;
	function parseStorageUsedShort(slice) {
	    return {
	        cells: slice.readVarUIntNumber(3),
	        bits: slice.readVarUIntNumber(3)
	    };
	}
	parseTransaction.parseStorageUsedShort = parseStorageUsedShort;
	function parseStoragePhase(slice) {
	    const storageFeesCollected = slice.readCoins();
	    let storageFeesDue = null;
	    if (slice.readBit()) {
	        storageFeesDue = slice.readCoins();
	    }
	    const statusChange = parseAccountChange(slice);
	    return {
	        storageFeesCollected,
	        storageFeesDue,
	        statusChange
	    };
	}
	parseTransaction.parseStoragePhase = parseStoragePhase;
	function parseCreditPhase(slice) {
	    let dueFeesColelcted = slice.readBit() ? slice.readCoins() : null;
	    const credit = parseCurrencyCollection(slice);
	    return {
	        dueFeesColelcted,
	        credit
	    };
	}
	parseTransaction.parseCreditPhase = parseCreditPhase;
	function parseComputePhase(slice) {
	    if (!slice.readBit()) {
	        const skipReason = slice.readUintNumber(2);
	        if (skipReason === 0x00) {
	            return {
	                type: 'skipped',
	                reason: 'no-state'
	            };
	        }
	        if (skipReason === 0x01) {
	            return {
	                type: 'skipped',
	                reason: 'bad-state'
	            };
	        }
	        if (skipReason === 0x02) {
	            return {
	                type: 'skipped',
	                reason: 'no-gas'
	            };
	        }
	    }
	    const success = slice.readBit();
	    const messageStateUsed = slice.readBit();
	    const accountActivated = slice.readBit();
	    let gasFees = slice.readCoins();
	    const vmState = slice.readRef();
	    let gasUsed = vmState.readVarUInt(3);
	    let gasLimit = vmState.readVarUInt(3);
	    let gasCredit = vmState.readBit() ? vmState.readVarUInt(2) : null;
	    let mode = vmState.readUintNumber(8);
	    let exitCode = vmState.readUintNumber(32);
	    let exitArg = vmState.readBit() ? vmState.readUintNumber(32) : null; // TODO: change to int
	    let vmSteps = vmState.readUintNumber(32);
	    let vmInitStateHash = vmState.readBuffer(32);
	    let vmFinalStateHash = vmState.readBuffer(32);
	    return {
	        type: 'computed',
	        success,
	        messageStateUsed,
	        accountActivated,
	        gasFees,
	        gasUsed,
	        gasLimit,
	        gasCredit,
	        mode,
	        exitCode,
	        exitArg,
	        vmSteps,
	        vmInitStateHash,
	        vmFinalStateHash
	    };
	}
	parseTransaction.parseComputePhase = parseComputePhase;
	function parseActionPhase(slice) {
	    const success = slice.readBit();
	    const valid = slice.readBit();
	    const noFunds = slice.readBit();
	    const statusChange = parseAccountChange(slice);
	    const totalFwdFees = slice.readBit() ? slice.readCoins() : null;
	    const totalActionFees = slice.readBit() ? slice.readCoins() : null;
	    const resultCode = slice.readUintNumber(32); // TODO: Change to int32
	    const resultArg = slice.readBit() ? slice.readUintNumber(32) : null; // TODO: Change to int32
	    const totalActions = slice.readUintNumber(16);
	    const specialActions = slice.readUintNumber(16);
	    const skippedActions = slice.readUintNumber(16);
	    const messagesCreated = slice.readUintNumber(16);
	    const actionListHash = slice.readBuffer(32);
	    const totalMessageSizes = parseStorageUsedShort(slice);
	    return {
	        success,
	        valid,
	        noFunds,
	        statusChange,
	        totalFwdFees,
	        totalActionFees,
	        resultCode,
	        resultArg,
	        totalActions,
	        specialActions,
	        skippedActions,
	        messagesCreated,
	        actionListHash,
	        totalMessageSizes
	    };
	}
	parseTransaction.parseActionPhase = parseActionPhase;
	function parseBouncePhase(slice) {
	    // Is OK
	    if (slice.readBit()) {
	        const msgSize = parseStorageUsedShort(slice);
	        const msgFees = slice.readCoins();
	        const fwdFees = slice.readCoins();
	        return {
	            type: 'ok',
	            msgSize,
	            msgFees,
	            fwdFees
	        };
	    }
	    // No funds
	    if (slice.readBit()) {
	        const msgSize = parseStorageUsedShort(slice);
	        const fwdFees = slice.readCoins();
	        return {
	            type: 'no-funds',
	            msgSize,
	            fwdFees
	        };
	    }
	    return {
	        type: 'negative-funds'
	    };
	}
	parseTransaction.parseBouncePhase = parseBouncePhase;
	function parseTransactionDescription(slice) {
	    const type = slice.readUintNumber(4);
	    if (type === 0x00) {
	        const creditFirst = slice.readBit();
	        let storagePhase = null;
	        let creditPhase = null;
	        if (slice.readBit()) {
	            storagePhase = parseStoragePhase(slice);
	        }
	        if (slice.readBit()) {
	            creditPhase = parseCreditPhase(slice);
	        }
	        let computePhase = parseComputePhase(slice);
	        let actionPhase = null;
	        if (slice.readBit()) {
	            actionPhase = parseActionPhase(slice.readRef());
	        }
	        let aborted = slice.readBit();
	        let bouncePhase = null;
	        if (slice.readBit()) {
	            bouncePhase = parseBouncePhase(slice);
	        }
	        const destroyed = slice.readBit();
	        return {
	            type: 'generic',
	            creditFirst,
	            storagePhase,
	            creditPhase,
	            computePhase,
	            actionPhase,
	            bouncePhase,
	            aborted,
	            destroyed
	        };
	    }
	    if (type === 0x01) {
	        let storagePhase = parseStoragePhase(slice);
	        return {
	            type: 'storage',
	            storagePhase
	        };
	    }
	    if (type === 0x2 || type === 0x03) {
	        const isTock = type === 0x03;
	        let storagePhase = parseStoragePhase(slice);
	        let computePhase = parseComputePhase(slice);
	        let actionPhase = null;
	        if (slice.readBit()) {
	            actionPhase = parseActionPhase(slice.readRef());
	        }
	        const aborted = slice.readBit();
	        const destroyed = slice.readBit();
	        return {
	            type: 'tick-tock',
	            isTock,
	            storagePhase,
	            computePhase,
	            actionPhase,
	            aborted,
	            destroyed
	        };
	    }
	    throw Error('Unsupported transaction type');
	}
	parseTransaction.parseTransactionDescription = parseTransactionDescription;
	function parseTransaction$1(workchain, slice) {
	    if (slice.readUintNumber(4) !== 0x07) {
	        throw Error('Invalid transaction');
	    }
	    // Read address
	    const addressHash = slice.readBuffer(32);
	    const address = new __1.Address(workchain, addressHash);
	    // Read lt
	    const lt = slice.readUint(64);
	    // Read prevTrans
	    const prevTransHash = slice.readBuffer(32);
	    const prevTransLt = slice.readUint(64);
	    // Read time
	    const time = slice.readUintNumber(32);
	    // Output messages
	    const outMessagesCount = slice.readUintNumber(15);
	    // Status
	    const oldStatus = parseAccountStatus(slice);
	    const newStatus = parseAccountStatus(slice);
	    // Messages ref
	    const messages = slice.readRef();
	    let hasInMessage = messages.readBit();
	    let hasOutMessages = messages.readBit();
	    let inMessage = null;
	    if (hasInMessage) {
	        inMessage = parseMessage(messages.readRef());
	    }
	    let outMessages = [];
	    if (hasOutMessages) {
	        let dict = messages.readDict(15, (slice) => parseMessage(slice.readRef()));
	        for (let msg of Array.from(dict.values())) {
	            outMessages.push(msg);
	        }
	    }
	    // Currency collections
	    let fees = parseCurrencyCollection(slice);
	    // Hash update
	    let update = parseHashUpdate(slice.readRef());
	    // Description
	    let description = parseTransactionDescription(slice.readRef());
	    return {
	        address,
	        lt,
	        time,
	        outMessagesCount,
	        oldStatus,
	        newStatus,
	        fees,
	        update,
	        description,
	        inMessage,
	        outMessages,
	        prevTransaction: {
	            hash: prevTransHash,
	            lt: prevTransLt
	        }
	    };
	}
	parseTransaction.parseTransaction = parseTransaction$1;
	return parseTransaction;
}

var hasRequiredDist;

function requireDist () {
	if (hasRequiredDist) return dist$1;
	hasRequiredDist = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.parseDictBitString = exports.parseDict = exports.ConfigStore = exports.WalletV3R2Source = exports.WalletV3R1Source = exports.WalletV2R2Source = exports.WalletV2R1Source = exports.WalletV1R3Source = exports.WalletV1R2Source = exports.WalletV1R1Source = exports.UnknownContractSource = exports.contractAddress = exports.createWalletTransferV3 = exports.createWalletTransferV2 = exports.createWalletTransferV1 = exports.WalletContract = exports.BinaryMessage = exports.CommentMessage = exports.CommonMessageInfo = exports.StateInit = exports.EmptyMessage = exports.ExternalMessage = exports.InternalMessage = exports.CellMessage = exports.parseSupportedMessage = exports.getSupportedInterfacesRaw = exports.resolveKnownInterface = exports.getSupportedInterfaces = exports.TupleSlice = exports.bnToAddress = exports.beginDict = exports.DictBuilder = exports.beginCell = exports.Builder = exports.ADNLKey = exports.ADNLAddress = exports.Slice = exports.HttpApi = exports.InMemoryCache = exports.SendMode = exports.KeyStore = exports.fromNano = exports.toNano = exports.Address = exports.validateWalletType = exports.Wallet = exports.TonClient = exports.Cell = exports.BitStringReader = exports.BitString = void 0;
		exports.parseTransactionDescription = exports.parseBouncePhase = exports.parseActionPhase = exports.parseComputePhase = exports.parseCreditPhase = exports.parseStoragePhase = exports.parseStorageUsedShort = exports.parseAccountChange = exports.parseHashUpdate = exports.parseMessage = exports.parseStateInit = exports.parseCommonMsgInfo = exports.parseCurrencyCollection = exports.parseAccountStatus = exports.parseTransaction = exports.safeSignVerify = exports.safeSign = exports.serializeDict = exports.parseDictRefs = void 0;
		var BitString_1 = require$$0$4;
		Object.defineProperty(exports, "BitString", { enumerable: true, get: function () { return BitString_1.BitString; } });
		var BitStringReader_1 = require$$1$3;
		Object.defineProperty(exports, "BitStringReader", { enumerable: true, get: function () { return BitStringReader_1.BitStringReader; } });
		var Cell_1 = require$$2$1;
		Object.defineProperty(exports, "Cell", { enumerable: true, get: function () { return Cell_1.Cell; } });
		var TonClient_1 = require$$3$2;
		Object.defineProperty(exports, "TonClient", { enumerable: true, get: function () { return TonClient_1.TonClient; } });
		var Wallet_1 = require$$4$1;
		Object.defineProperty(exports, "Wallet", { enumerable: true, get: function () { return Wallet_1.Wallet; } });
		Object.defineProperty(exports, "validateWalletType", { enumerable: true, get: function () { return Wallet_1.validateWalletType; } });
		var Address_1 = require$$5$1;
		Object.defineProperty(exports, "Address", { enumerable: true, get: function () { return Address_1.Address; } });
		var convert_1 = convert;
		Object.defineProperty(exports, "toNano", { enumerable: true, get: function () { return convert_1.toNano; } });
		Object.defineProperty(exports, "fromNano", { enumerable: true, get: function () { return convert_1.fromNano; } });
		var KeyStore_1 = require$$7$1;
		Object.defineProperty(exports, "KeyStore", { enumerable: true, get: function () { return KeyStore_1.KeyStore; } });
		var SendMode_1 = SendMode;
		Object.defineProperty(exports, "SendMode", { enumerable: true, get: function () { return SendMode_1.SendMode; } });
		var TonCache_1 = TonCache;
		Object.defineProperty(exports, "InMemoryCache", { enumerable: true, get: function () { return TonCache_1.InMemoryCache; } });
		var HttpApi_1 = require$$10;
		Object.defineProperty(exports, "HttpApi", { enumerable: true, get: function () { return HttpApi_1.HttpApi; } });
		var Slice_1 = requireSlice();
		Object.defineProperty(exports, "Slice", { enumerable: true, get: function () { return Slice_1.Slice; } });
		var ADNLAddress_1 = require$$12;
		Object.defineProperty(exports, "ADNLAddress", { enumerable: true, get: function () { return ADNLAddress_1.ADNLAddress; } });
		var ADNLKey_1 = require$$13;
		Object.defineProperty(exports, "ADNLKey", { enumerable: true, get: function () { return ADNLKey_1.ADNLKey; } });
		var Builder_1 = Builder$1;
		Object.defineProperty(exports, "Builder", { enumerable: true, get: function () { return Builder_1.Builder; } });
		Object.defineProperty(exports, "beginCell", { enumerable: true, get: function () { return Builder_1.beginCell; } });
		var DictBuilder_1 = require$$15;
		Object.defineProperty(exports, "DictBuilder", { enumerable: true, get: function () { return DictBuilder_1.DictBuilder; } });
		Object.defineProperty(exports, "beginDict", { enumerable: true, get: function () { return DictBuilder_1.beginDict; } });
		var bnToAddress_1 = require$$16;
		Object.defineProperty(exports, "bnToAddress", { enumerable: true, get: function () { return bnToAddress_1.bnToAddress; } });
		var TupleSlice_1 = require$$17;
		Object.defineProperty(exports, "TupleSlice", { enumerable: true, get: function () { return TupleSlice_1.TupleSlice; } });
		var getSupportedInterfaces_1 = getSupportedInterfaces$1;
		Object.defineProperty(exports, "getSupportedInterfaces", { enumerable: true, get: function () { return getSupportedInterfaces_1.getSupportedInterfaces; } });
		Object.defineProperty(exports, "resolveKnownInterface", { enumerable: true, get: function () { return getSupportedInterfaces_1.resolveKnownInterface; } });
		Object.defineProperty(exports, "getSupportedInterfacesRaw", { enumerable: true, get: function () { return getSupportedInterfaces_1.getSupportedInterfacesRaw; } });
		var parseSupportedMessage_1 = parseSupportedMessage$1;
		Object.defineProperty(exports, "parseSupportedMessage", { enumerable: true, get: function () { return parseSupportedMessage_1.parseSupportedMessage; } });
		var CellMessage_1 = CellMessage$1;
		Object.defineProperty(exports, "CellMessage", { enumerable: true, get: function () { return CellMessage_1.CellMessage; } });
		var InternalMessage_1 = InternalMessage$1;
		Object.defineProperty(exports, "InternalMessage", { enumerable: true, get: function () { return InternalMessage_1.InternalMessage; } });
		var ExternalMessage_1 = ExternalMessage$1;
		Object.defineProperty(exports, "ExternalMessage", { enumerable: true, get: function () { return ExternalMessage_1.ExternalMessage; } });
		var EmptyMessage_1 = EmptyMessage$1;
		Object.defineProperty(exports, "EmptyMessage", { enumerable: true, get: function () { return EmptyMessage_1.EmptyMessage; } });
		var StateInit_1 = StateInit$1;
		Object.defineProperty(exports, "StateInit", { enumerable: true, get: function () { return StateInit_1.StateInit; } });
		var CommonMessageInfo_1 = CommonMessageInfo$1;
		Object.defineProperty(exports, "CommonMessageInfo", { enumerable: true, get: function () { return CommonMessageInfo_1.CommonMessageInfo; } });
		var CommentMessage_1 = require$$26;
		Object.defineProperty(exports, "CommentMessage", { enumerable: true, get: function () { return CommentMessage_1.CommentMessage; } });
		var BinaryMessage_1 = BinaryMessage$1;
		Object.defineProperty(exports, "BinaryMessage", { enumerable: true, get: function () { return BinaryMessage_1.BinaryMessage; } });
		var WalletContract_1 = requireWalletContract();
		Object.defineProperty(exports, "WalletContract", { enumerable: true, get: function () { return WalletContract_1.WalletContract; } });
		var createWalletTransfer_1 = requireCreateWalletTransfer();
		Object.defineProperty(exports, "createWalletTransferV1", { enumerable: true, get: function () { return createWalletTransfer_1.createWalletTransferV1; } });
		Object.defineProperty(exports, "createWalletTransferV2", { enumerable: true, get: function () { return createWalletTransfer_1.createWalletTransferV2; } });
		Object.defineProperty(exports, "createWalletTransferV3", { enumerable: true, get: function () { return createWalletTransfer_1.createWalletTransferV3; } });
		// Sources
		var contractAddress_1 = requireContractAddress();
		Object.defineProperty(exports, "contractAddress", { enumerable: true, get: function () { return contractAddress_1.contractAddress; } });
		var UnknownContractSource_1 = UnknownContractSource$1;
		Object.defineProperty(exports, "UnknownContractSource", { enumerable: true, get: function () { return UnknownContractSource_1.UnknownContractSource; } });
		var WalletV1R1Source_1 = requireWalletV1R1Source();
		Object.defineProperty(exports, "WalletV1R1Source", { enumerable: true, get: function () { return WalletV1R1Source_1.WalletV1R1Source; } });
		var WalletV1R2Source_1 = requireWalletV1R2Source();
		Object.defineProperty(exports, "WalletV1R2Source", { enumerable: true, get: function () { return WalletV1R2Source_1.WalletV1R2Source; } });
		var WalletV1R3Source_1 = requireWalletV1R3Source();
		Object.defineProperty(exports, "WalletV1R3Source", { enumerable: true, get: function () { return WalletV1R3Source_1.WalletV1R3Source; } });
		var WalletV2R1Source_1 = requireWalletV2R1Source();
		Object.defineProperty(exports, "WalletV2R1Source", { enumerable: true, get: function () { return WalletV2R1Source_1.WalletV2R1Source; } });
		var WalletV2R2Source_1 = requireWalletV2R2Source();
		Object.defineProperty(exports, "WalletV2R2Source", { enumerable: true, get: function () { return WalletV2R2Source_1.WalletV2R2Source; } });
		var WalletV3R1Source_1 = requireWalletV3R1Source();
		Object.defineProperty(exports, "WalletV3R1Source", { enumerable: true, get: function () { return WalletV3R1Source_1.WalletV3R1Source; } });
		var WalletV3R2Source_1 = requireWalletV3R2Source();
		Object.defineProperty(exports, "WalletV3R2Source", { enumerable: true, get: function () { return WalletV3R2Source_1.WalletV3R2Source; } });
		// Utils
		var ConfigStore_1 = require$$39;
		Object.defineProperty(exports, "ConfigStore", { enumerable: true, get: function () { return ConfigStore_1.ConfigStore; } });
		var parseDict_1 = parseDict$1;
		Object.defineProperty(exports, "parseDict", { enumerable: true, get: function () { return parseDict_1.parseDict; } });
		Object.defineProperty(exports, "parseDictBitString", { enumerable: true, get: function () { return parseDict_1.parseDictBitString; } });
		Object.defineProperty(exports, "parseDictRefs", { enumerable: true, get: function () { return parseDict_1.parseDictRefs; } });
		var serializeDict_1 = serializeDict$1;
		Object.defineProperty(exports, "serializeDict", { enumerable: true, get: function () { return serializeDict_1.serializeDict; } });
		var safeSign_1 = require$$42;
		Object.defineProperty(exports, "safeSign", { enumerable: true, get: function () { return safeSign_1.safeSign; } });
		Object.defineProperty(exports, "safeSignVerify", { enumerable: true, get: function () { return safeSign_1.safeSignVerify; } });
		// Transaction
		var parseTransaction_1 = requireParseTransaction();
		Object.defineProperty(exports, "parseTransaction", { enumerable: true, get: function () { return parseTransaction_1.parseTransaction; } });
		Object.defineProperty(exports, "parseAccountStatus", { enumerable: true, get: function () { return parseTransaction_1.parseAccountStatus; } });
		Object.defineProperty(exports, "parseCurrencyCollection", { enumerable: true, get: function () { return parseTransaction_1.parseCurrencyCollection; } });
		Object.defineProperty(exports, "parseCommonMsgInfo", { enumerable: true, get: function () { return parseTransaction_1.parseCommonMsgInfo; } });
		Object.defineProperty(exports, "parseStateInit", { enumerable: true, get: function () { return parseTransaction_1.parseStateInit; } });
		Object.defineProperty(exports, "parseMessage", { enumerable: true, get: function () { return parseTransaction_1.parseMessage; } });
		Object.defineProperty(exports, "parseHashUpdate", { enumerable: true, get: function () { return parseTransaction_1.parseHashUpdate; } });
		Object.defineProperty(exports, "parseAccountChange", { enumerable: true, get: function () { return parseTransaction_1.parseAccountChange; } });
		Object.defineProperty(exports, "parseStorageUsedShort", { enumerable: true, get: function () { return parseTransaction_1.parseStorageUsedShort; } });
		Object.defineProperty(exports, "parseStoragePhase", { enumerable: true, get: function () { return parseTransaction_1.parseStoragePhase; } });
		Object.defineProperty(exports, "parseCreditPhase", { enumerable: true, get: function () { return parseTransaction_1.parseCreditPhase; } });
		Object.defineProperty(exports, "parseComputePhase", { enumerable: true, get: function () { return parseTransaction_1.parseComputePhase; } });
		Object.defineProperty(exports, "parseActionPhase", { enumerable: true, get: function () { return parseTransaction_1.parseActionPhase; } });
		Object.defineProperty(exports, "parseBouncePhase", { enumerable: true, get: function () { return parseTransaction_1.parseBouncePhase; } });
		Object.defineProperty(exports, "parseTransactionDescription", { enumerable: true, get: function () { return parseTransaction_1.parseTransactionDescription; } });
} (dist$1));
	return dist$1;
}

Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletV4Source = void 0;
const ton_1$1 = require("ton");
class WalletV4Source {
    constructor(args) {
        this.type = 'org.ton.wallets.v4';
        this.initialCode = args.initialCode;
        this.initialData = args.initialData;
        this.workchain = args.workchain;
        this.walletId = args.walletId;
        this.publicKey = args.publicKey;
    }
    static create(opts) {
        // Build initial code and data
        const walletId = opts.walletId ? opts.walletId : 698983191;
        let initialCode = ton_1$1.Cell.fromBoc(WalletV4Source.SOURCE)[0];
        let initialData = new ton_1$1.Cell();
        initialData.bits.writeUint(0, 32);
        initialData.bits.writeUint(walletId, 32);
        initialData.bits.writeBuffer(opts.publicKey);
        initialData.bits.writeBit(0);
        return new WalletV4Source({ initialCode, initialData, workchain: opts.workchain, walletId, publicKey: opts.publicKey });
    }
    static restore(backup) {
        const store = new ton_1$1.ConfigStore(backup);
        return WalletV4Source.create({
            workchain: store.getInt('wc'),
            publicKey: store.getBuffer('pk'),
            walletId: store.getInt('walletId'),
        });
    }
    describe() {
        return 'Wallet v4 #' + this.walletId;
    }
    backup() {
        const config = new ton_1$1.ConfigStore();
        config.setInt('wc', this.workchain);
        config.setBuffer('pk', this.publicKey);
        config.setInt('walletId', this.walletId);
        return config.save();
    }
}
exports.WalletV4Source = WalletV4Source;
WalletV4Source.SOURCE = Buffer.from('te6ccgECFAEAAtQAART/APSkE/S88sgLAQIBIAIDAgFIBAUE+PKDCNcYINMf0x/THwL4I7vyZO1E0NMf0x/T//QE0VFDuvKhUVG68qIF+QFUEGT5EPKj+AAkpMjLH1JAyx9SMMv/UhD0AMntVPgPAdMHIcAAn2xRkyDXSpbTB9QC+wDoMOAhwAHjACHAAuMAAcADkTDjDQOkyMsfEssfy/8QERITAubQAdDTAyFxsJJfBOAi10nBIJJfBOAC0x8hghBwbHVnvSKCEGRzdHK9sJJfBeAD+kAwIPpEAcjKB8v/ydDtRNCBAUDXIfQEMFyBAQj0Cm+hMbOSXwfgBdM/yCWCEHBsdWe6kjgw4w0DghBkc3RyupJfBuMNBgcCASAICQB4AfoA9AQw+CdvIjBQCqEhvvLgUIIQcGx1Z4MesXCAGFAEywUmzxZY+gIZ9ADLaRfLH1Jgyz8gyYBA+wAGAIpQBIEBCPRZMO1E0IEBQNcgyAHPFvQAye1UAXKwjiOCEGRzdHKDHrFwgBhQBcsFUAPPFiP6AhPLassfyz/JgED7AJJfA+ICASAKCwBZvSQrb2omhAgKBrkPoCGEcNQICEekk30pkQzmkD6f+YN4EoAbeBAUiYcVnzGEAgFYDA0AEbjJftRNDXCx+AA9sp37UTQgQFA1yH0BDACyMoHy//J0AGBAQj0Cm+hMYAIBIA4PABmtznaiaEAga5Drhf/AABmvHfaiaEAQa5DrhY/AAG7SB/oA1NQi+QAFyMoHFcv/ydB3dIAYyMsFywIizxZQBfoCFMtrEszMyXP7AMhAFIEBCPRR8qcCAHCBAQjXGPoA0z/IVCBHgQEI9FHyp4IQbm90ZXB0gBjIywXLAlAGzxZQBPoCFMtqEssfyz/Jc/sAAgBsgQEI1xj6ANM/MFIkgQEI9Fnyp4IQZHN0cnB0gBjIywXLAlAFzxZQA/oCE8tqyx8Syz/Jc/sAAAr0AMntVA==', 'base64');

var WalletV4Source$1 = /*#__PURE__*/Object.freeze({
	__proto__: null
});

var require$$1 = /*@__PURE__*/getAugmentedNamespace(WalletV4Source$1);

Object.defineProperty(extractPublicKeyAndAddress$1, "__esModule", { value: true });
extractPublicKeyAndAddress$1.extractPublicKeyAndAddress = void 0;
const ton_1 = requireDist();
const WalletV4Source_1 = require$$1;
function extractPublicKeyAndAddress(config) {
    // Extract public key and address
    let publicKey;
    let restoredAddress;
    if (config.walletType === 'org.ton.wallets.v4') {
        let source = WalletV4Source_1.WalletV4Source.restore(config.walletConfig);
        restoredAddress = (0, ton_1.contractAddress)(source);
        publicKey = source.publicKey;
    }
    else {
        return null;
    }
    // Public key
    return { publicKey, address: restoredAddress };
}
extractPublicKeyAndAddress$1.extractPublicKeyAndAddress = extractPublicKeyAndAddress;

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.extractPublicKeyAndAddress = exports.verifySignatureResponse = exports.TonhubLocalConnector = exports.TonhubConnector = void 0;
	var TonhubConnector_1 = require$$0$5;
	Object.defineProperty(exports, "TonhubConnector", { enumerable: true, get: function () { return TonhubConnector_1.TonhubConnector; } });
	var TonhubLocalConnector_1 = require$$1$4;
	Object.defineProperty(exports, "TonhubLocalConnector", { enumerable: true, get: function () { return TonhubLocalConnector_1.TonhubLocalConnector; } });
	var crypto_1 = require$$2$2;
	Object.defineProperty(exports, "verifySignatureResponse", { enumerable: true, get: function () { return crypto_1.verifySignatureResponse; } });
	var extractPublicKeyAndAddress_1 = extractPublicKeyAndAddress$1;
	Object.defineProperty(exports, "extractPublicKeyAndAddress", { enumerable: true, get: function () { return extractPublicKeyAndAddress_1.extractPublicKeyAndAddress; } });
} (dist$2));

var TonhubConnector$2 = dist$2.TonhubConnector;
export { TonhubConnector$2 as TonhubConnector, create, toCanvas };
