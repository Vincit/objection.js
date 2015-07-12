/**
 * Parser for parsing field expressions.
 *
 * Simple syntax: <column reference>[:<json field reference>]
 *
 * First part of input describes always column reference, which is compatible with column references 
 * used in knex e.g. "MyFancyTable.tributeToThBestColumnNameEver".
 *
 * If first json field reference is name it starts directly after colon:
 * "Table.jsonObjectColumnName:jsonFieldName"
 *
 * If first json field reference is accessed with [] operator
 * "Table.jsonArrayColumn:[321]"
 *
 * Syntax supports few flavors of reference to json keys:
 *
 * Json arrays has only one type of syntax:
 * 
 * `Table.arrayColumn:[1][3]` Column called `arrayColumn` in database row could have following data 
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
 *
 * For compiling this to parser run `pegjs JsonFieldExpressionParser.pegjs` which generates
 * the `JsonFieldExpressionParser.js`
 *
 * For development there is nice page for interactively hacking parser code
 * http://pegjs.org/online
 */

start = 
  column:stringWithoutColon
  refs:(':'
    (bracketIndexRef / bracketStringRef / colonReference)
    (bracketIndexRef / bracketStringRef / dotReference)*
  )?
  { 
    var access = [];
    if (refs) {
      var firstAccess = refs[1];
      access = refs[2];
      access.unshift(firstAccess);
    }
    return { columnName: column, access: access };
  }

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

colonReference = 
  key:stringWithoutSquareBracketsOrDots 
  { return { type: 'object', ref: key }; }

dotReference = 
  '.' key:stringWithoutSquareBracketsOrDots 
  { return { type: 'object', ref: key }; }

stringWithoutSquareBrackets = 
  chars:([^\x5D\x5B])+ { return chars.join(""); }

stringWithoutColon = 
  chars:([^:])+ { return chars.join(""); }

stringWithoutDoubleQuotes = 
  chars:([^"])+ { return chars.join(""); }

stringWithoutSingleQuotes = 
  chars:([^'])+ { return chars.join(""); }

stringWithoutSquareBracketsOrDots = 
  chars:([^.\x5D\x5B])+ { return chars.join(""); }

integer = digits:[0-9]+ { return digits.join(""); }
