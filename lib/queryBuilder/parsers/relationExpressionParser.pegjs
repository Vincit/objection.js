{
  function assertDuplicateRelation(node, expr) {
    if (expr.$name in node) {
      console.warn(`Duplicate relation "${expr.$name}" in a relation expression. You should use "a.[b, c]" instead of "[a.b, a.c]". This will cause an error in objection 2.0`);

      // TODO: enable for v2.0.
      // const err = new Error();
      // err.duplicateRelationName = expr.$name;
      // throw err;
    }
  }

  function newNode() {
    return {
      $name: null,
      $relation: null,
      $modify: [],
      $recursive: false,
      $allRecursive: false,
      $childNames: []
    };
  }
}

start =
  expr:expression {
    const node = newNode()

    if (expr.$name === '*') {
      node.$allRecursive = true;
    } else {
      assertDuplicateRelation(node, expr);
      node[expr.$name] = expr;
      node.$childNames.push(expr.$name)
    }

    return node;
  }
  /
  list:listExpression {
    const node = newNode()

    list.forEach(expr => {
      assertDuplicateRelation(node, expr);
      node[expr.$name] = expr;
      node.$childNames.push(expr.$name)
    });

    return node;
  }

expression =
  name:name args:args? alias:alias? list:subListExpression {
    const node = newNode()

    node.$name = alias || name;
    node.$relation = name;
    node.$modify = args || [];

    list.forEach(expr => {
      assertDuplicateRelation(node, expr);
      node[expr.$name] = expr;
      node.$childNames.push(expr.$name)
    });

    return node;
  }
  /
  name:name args:args? alias:alias? expr:subExpression? {
    const node = newNode()

    node.$name = alias || name;
    node.$relation = name;
    node.$modify = args || [];

    if (expr) {
      const match = /^\^(\d*)$/.exec(expr.$name);

      if (match) {
        if (match[1]) {
          node.$recursive = parseInt(match[1], 10);
        } else {
          node.$recursive = true;
        }
      } else if (expr.$name === '*') {
        node.$allRecursive = true;
      } else {
        assertDuplicateRelation(node, expr);
        node[expr.$name] = expr;
        node.$childNames.push(expr.$name)
      }
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
    return items;
  }

listExpressionItem =
  ws* expr:expression ws* ","? {
    return expr;
  }

subExpression =
  ws* "." ws* sub:expression ws* {
    return sub;
  }
