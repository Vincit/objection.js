start =
  expr:expression {
    var node = {name: null, alias: null, args: [], numChildren: 1, children: {}};
    node.children[expr.alias] = expr;
    return node;
  }
  /
  list:listExpression {
    return {name: null, alias: null, args: [], numChildren: list.list.length, children: list.byAlias};
  }

expression =
  name:name args:args? alias:alias? list:subListExpression {
    return {name: name, alias: alias || name, args: args || [], numChildren: list.list.length, children: list.byAlias};
  }
  /
  name:name args:args? alias:alias? sub:subExpression? {
    var node = {name: name, alias: alias || name, args: args || [], numChildren: 0, children: {}};
    if (sub) {
      node.numChildren = 1;
      node.children[sub.alias] = sub;
    }
    return node;
  }

alias = 
  ws+ "as" ws+ alias:name {
    return alias;
  }

name =
  name:char+ {
    return name.join('');
  }

char =
  [^\[\]\(\),\. \t\r\n]

args =
  ws* "(" args:argListItem* ws* ")" {
    return args;
  }

argListItem =
  ws* arg:name ws* ","? {
    return arg;
  }

ws =
  [ \t\r\n]

subListExpression =
  ws* "." list:listExpression {
    return list;
  }

listExpression =
  ws* "[" items:listExpressionItem* ws* "]" ws* {
    var itemsByAlias = {};

    for (var i = 0; i < items.length; ++i) {
      itemsByAlias[items[i].alias] = items[i];
    }

    return {
      list: items,
      byAlias: itemsByAlias
    };
  }

listExpressionItem =
  ws* expr:expression ws* ","? {
    return expr;
  }

subExpression =
  ws* "." ws* sub:expression ws* {
    return sub;
  }