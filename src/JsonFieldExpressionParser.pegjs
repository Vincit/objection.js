/**
 * Parser for parsing field expressions.
 * 
 * Syntax supports few flavors of reference to keys:
 *
 * Json arrays has only one type of syntax:
 * 
 * `arrayColumn[1][3]` Column called `arrayColumn` in database row could have following data 
 * `[null, [null,null,null, "I was accessed"]`
 * 
 * For referring objects there is more different ways to access them:
 * 
 * 1. `objectColumn.key` This is the most common syntax, good if you are 
 *    not using dots or square brackets `[]` in your json object key name.
 * 2. Keys containing dots `objectColumn[keywith.dots]` Column `{ "keywith.dots" : "I was referred" }`
 * 3. Keys containing square brackets and quotes 
 *    `objectColumn['Double."Quote".[]']` and `objectColumn["Sinlge.'Quote'.[]"]` 
 *    Column `{ "Double.\"Quote\".[]" : "I was referred",  "Sinlge.'Quote'.[]" : "Mee too!" }`
 * 99. Keys containing dots, square brackets, single quotes and double quotes in one json key is 
 *     not currently supported
 */

start = 
  column:stringWithoutSquareBracketsOrDots refs:(bracketIndexRef / bracketStringRef / dotReference)* 
  { return { columnName: column, access: refs } }

bracketStringRef = 
  '['
      key:(
       '"' stringWithoutDoubleQuotes '"' /
       "'" stringWithoutSingleQuotes "'" /
       stringWithoutSquareBrackets
      ) 
  ']' 
  { return { type: 'object', ref: Array.isArray(key) ? key[1] : key }; }

bracketIndexRef = 
  '[' index:integer ']' 
  { return { type: 'array', ref: parseInt(index, 10) }; }

dotReference = 
  '.' key:stringWithoutSquareBracketsOrDots 
  { return { type: 'object', ref: key }; }

stringWithoutSquareBrackets = 
  chars:([^\x5D\x5B])+ { return chars.join(""); }

stringWithoutDoubleQuotes = 
  chars:([^""])+ { return chars.join(""); }

stringWithoutSingleQuotes = 
  chars:([^''])+ { return chars.join(""); }

stringWithoutSquareBracketsOrDots = 
  chars:([^.\x5D\x5B])+ { return chars.join(""); }

integer = digits:[0-9]+ { return digits.join(""); }
