start =
  expr:expression {
    var node = {name: null, args: [], numChildren: 1, children: {}};
    node.children[expr.name] = expr;
    return node;
  }
  /
  list:listExpression {
    return {name: null, args: [], numChildren: list.list.length, children: list.byName};
  }

expression =
  rel:relation args:args? list:subListExpression {
    return {name: rel, args: args || [], numChildren: list.list.length, children: list.byName};
  }
  /
  rel:relation args:args? sub:subExpression? {
    var node = {name: rel, args: args || [], numChildren: 0, children: {}};
    if (sub) {
      node.numChildren = 1;
      node.children[sub.name] = sub;
    }
    return node;
  }

relation =
  rel:char+ {
    return rel.join('')
  }

char =
  [^\[\]\(\),\. \t\r\n]

args =
  ws "(" args:argListItem* ")" ws {
    return args
  }

argListItem =
  ws arg:arg ws ","? ws {
    return arg
  }

ws =
  [ \t\r\n]*

arg =
  rel:char+ {
    return rel.join('')
  }

subListExpression =
  ws "." ws list:listExpression ws {
    return list
  }

listExpression =
  ws "[" items:listExpressionItem* "]" ws {
    var itemsByName = {};

    for (var i = 0; i < items.length; ++i) {
      itemsByName[items[i].name] = items[i];
    }

    return {
      list: items,
      byName: itemsByName
    };
  }

listExpressionItem =
  ws expr:expression ws ","? ws {
    return expr
  }

subExpression =
  ws "." ws sub:expression ws {
    return sub
  }