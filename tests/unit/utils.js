const expect = require('expect.js');
const classUtils = require('../../lib/utils/classUtils');
const { delay, range } = require('../../testUtils/testUtils');

const {
  snakeCase,
  camelCase,
  snakeCaseKeys,
  camelCaseKeys,
  snakeCaseMappers,
  knexSnakeCaseMappers,
} = require('../../lib/utils/identifierMapping');

const { compose, mixin } = require('../../lib/utils/mixin');
const { map } = require('../../lib/utils/promiseUtils');
const { cloneDeep, jsonEquals, uniqBy, union } = require('../../lib/utils/objectUtils');

describe('utils', () => {
  describe('mixin', () => {
    it('should mixin rest of the arguments to the first argument', () => {
      class X {}

      const m1 = (C) =>
        class extends C {
          f() {
            return 1;
          }
        };

      const m2 = (C) =>
        class extends C {
          f() {
            return super.f() + 1;
          }
        };

      const Y = mixin(X, m1, m2);
      const y = new Y();

      expect(y.f()).to.equal(2);

      if (process.version >= 'v8.0.0') {
        expect(Y.name).to.equal('X');
      }

      const Z = mixin(X, [m1, m2]);
      const z = new Z();

      expect(z.f()).to.equal(2);

      if (process.version >= 'v8.0.0') {
        expect(Z.name).to.equal('X');
      }
    });
  });

  describe('compose', () => {
    it('should compose multiple functions', () => {
      class X {}

      const m1 = (C) =>
        class extends C {
          f() {
            return 1;
          }
        };

      const m2 = (C) =>
        class extends C {
          f() {
            return super.f() + 1;
          }
        };

      const m3 = compose(m1, m2);
      const m4 = compose([m1, m2]);

      const Y = m3(X);
      const y = new Y();

      expect(y.f()).to.equal(2);

      if (process.version >= 'v8.0.0') {
        expect(Y.name).to.equal('X');
      }

      const Z = m4(X);
      const z = new Z();

      expect(z.f()).to.equal(2);

      if (process.version >= 'v8.0.0') {
        expect(Z.name).to.equal('X');
      }
    });
  });

  describe('snakeCase module', () => {
    describe('snakeCase and camelCase functions', () => {
      test('*', '*');

      test('foo', 'foo');
      test('fooBar', 'foo_bar');
      test('foo1Bar2', 'foo1_bar2');
      test('fooBAR', 'foo_bar', 'fooBar');
      test('fooBaR', 'foo_ba_r');

      test('föö', 'föö');
      test('fööBär', 'föö_bär');
      test('föö1Bär2', 'föö1_bär2');
      test('fööBÄR', 'föö_bär', 'fööBär');
      test('fööBäR', 'föö_bä_r');

      test('foo1bar2', 'foo1bar2');
      test('Foo', 'foo', 'foo');
      test('FooBar', 'foo_bar', 'fooBar');
      test('märkäLänttiÄäliö', 'märkä_läntti_ääliö');

      test('fooBar:spamBaz:troloLolo', 'foo_bar:spam_baz:trolo_lolo');
      test('fooBar.spamBaz.troloLolo', 'foo_bar.spam_baz.trolo_lolo');

      testUnderscoreBeforeNumbers('*', '*');

      testUnderscoreBeforeNumbers('foo', 'foo');
      testUnderscoreBeforeNumbers('fooBar', 'foo_bar');
      testUnderscoreBeforeNumbers('foo1Bar2', 'foo_1_bar_2');
      testUnderscoreBeforeNumbers('fooBAR', 'foo_bar', 'fooBar');
      testUnderscoreBeforeNumbers('fooBaR', 'foo_ba_r');

      testUnderscoreBeforeNumbers('föö', 'föö');
      testUnderscoreBeforeNumbers('fööBär', 'föö_bär');
      testUnderscoreBeforeNumbers('föö1Bär2', 'föö_1_bär_2');
      testUnderscoreBeforeNumbers('föö12Bär21', 'föö_12_bär_21');
      testUnderscoreBeforeNumbers('föö09Bär90', 'föö_09_bär_90');
      testUnderscoreBeforeNumbers('fööBÄR', 'föö_bär', 'fööBär');
      testUnderscoreBeforeNumbers('fööBäR', 'föö_bä_r');

      testUnderscoreBeforeNumbers('foo1bar2', 'foo_1bar_2');
      // Existing underscores before digits are doubled by default (kept for
      // backwards compatibility, see `noDoubleUnderscores`).
      testUnderscoreBeforeNumbers('foo_1bar_2', 'foo__1bar__2', 'foo1bar2');
      testUnderscoreBeforeNumbers('test_2_tables', 'test__2_tables', 'test2Tables');
      testUnderscoreBeforeNumbers('Foo', 'foo', 'foo');
      testUnderscoreBeforeNumbers('FooBar', 'foo_bar', 'fooBar');
      testUnderscoreBeforeNumbers('märkäLänttiÄäliö', 'märkä_läntti_ääliö');

      testUnderscoreBeforeNumbers('fooBar:spamBaz:troloLolo', 'foo_bar:spam_baz:trolo_lolo');
      testUnderscoreBeforeNumbers('fooBar.spamBaz.troloLolo', 'foo_bar.spam_baz.trolo_lolo');

      testUnderscoreBetweenUppercaseLetters('*', '*');

      testUnderscoreBetweenUppercaseLetters('foo', 'foo');
      testUnderscoreBetweenUppercaseLetters('fooBar', 'foo_bar');
      testUnderscoreBetweenUppercaseLetters('foo1Bar2', 'foo1_bar2');
      testUnderscoreBetweenUppercaseLetters('fooBAR', 'foo_b_a_r');
      testUnderscoreBetweenUppercaseLetters('fooBaR', 'foo_ba_r');

      testUnderscoreBetweenUppercaseLetters('föö', 'föö');
      testUnderscoreBetweenUppercaseLetters('fööBär', 'föö_bär');
      testUnderscoreBetweenUppercaseLetters('föö1Bär2', 'föö1_bär2');
      testUnderscoreBetweenUppercaseLetters('föö09Bär90', 'föö09_bär90');
      testUnderscoreBetweenUppercaseLetters('fööBÄR', 'föö_b_ä_r');
      testUnderscoreBetweenUppercaseLetters('fööBäR', 'föö_bä_r');

      testUnderscoreBetweenUppercaseLetters('foo1bar2', 'foo1bar2');
      testUnderscoreBetweenUppercaseLetters('Foo', 'foo', 'foo');
      testUnderscoreBetweenUppercaseLetters('FooBar', 'foo_bar', 'fooBar');
      testUnderscoreBetweenUppercaseLetters('märkäLänttiÄäliö', 'märkä_läntti_ääliö');

      testUnderscoreBetweenUppercaseLetters(
        'fooBar:spamBaz:troloLolo',
        'foo_bar:spam_baz:trolo_lolo',
      );
      testUnderscoreBetweenUppercaseLetters(
        'fooBar.spamBaz.troloLolo',
        'foo_bar.spam_baz.trolo_lolo',
      );

      test('foo_Bar', 'foo__bar', 'fooBar');

      testNoDoubleUnderscores('foo', 'foo');
      testNoDoubleUnderscores('fooBar', 'foo_bar');
      testNoDoubleUnderscores('foo_bar', 'foo_bar', 'fooBar');
      testNoDoubleUnderscores('foo_Bar', 'foo_bar', 'fooBar');
      testNoDoubleUnderscores('foo__bar', 'foo__bar', 'fooBar');
      testNoDoubleUnderscores('foo1Bar2', 'foo1_bar2');
      testNoDoubleUnderscores('foo_1', 'foo_1', 'foo1');

      testNoDoubleUnderscores('foo1Bar2', 'foo_1_bar_2', null, { underscoreBeforeDigits: true });
      testNoDoubleUnderscores('foo_1bar_2', 'foo_1bar_2', 'foo1bar2', {
        underscoreBeforeDigits: true,
      });
      testNoDoubleUnderscores('test_2_tables', 'test_2_tables', 'test2Tables', {
        underscoreBeforeDigits: true,
      });
      testNoDoubleUnderscores('foo_BAR', 'foo_b_a_r', 'fooBAR', {
        underscoreBetweenUppercaseLetters: true,
      });
      testNoDoubleUnderscores('FOO_1', 'FOO_1', 'foo1', {
        upperCase: true,
        underscoreBeforeDigits: true,
      });

      function test(camel, snake, backToCamel) {
        backToCamel = backToCamel || camel;

        it(`${camel} --> ${snake} --> ${backToCamel}`, () => {
          expect(snakeCase(camel)).to.equal(snake);
          expect(snakeCaseKeys({ [camel]: 'foo' })).to.eql({ [snake]: 'foo' });

          expect(camelCase(snakeCase(camel))).to.equal(backToCamel);
          expect(camelCaseKeys(snakeCaseKeys({ [camel]: 'foo' }))).to.eql({ [backToCamel]: 'foo' });
        });
      }

      function testUnderscoreBeforeNumbers(camel, snake, backToCamel) {
        backToCamel = backToCamel || camel;
        const opt = { underscoreBeforeDigits: true };

        it(`${camel} --> ${snake} --> ${backToCamel}`, () => {
          expect(snakeCase(camel, opt)).to.equal(snake);
          expect(camelCase(snakeCase(camel, opt), opt)).to.equal(backToCamel);
        });
      }

      function testUnderscoreBetweenUppercaseLetters(camel, snake, backToCamel) {
        backToCamel = backToCamel || camel;
        const opt = { underscoreBetweenUppercaseLetters: true };

        it(`${camel} --> ${snake} --> ${backToCamel}`, () => {
          expect(snakeCase(camel, opt)).to.equal(snake);
          expect(camelCase(snakeCase(camel, opt), opt)).to.equal(backToCamel);
        });
      }

      function testNoDoubleUnderscores(camel, snake, backToCamel, extraOpt = {}) {
        backToCamel = backToCamel || camel;
        const opt = { noDoubleUnderscores: true, ...extraOpt };

        it(`${camel} --> ${snake} --> ${backToCamel} (${JSON.stringify(opt)})`, () => {
          expect(snakeCase(camel, opt)).to.equal(snake);
          expect(camelCase(snakeCase(camel, opt), opt)).to.equal(backToCamel);

          const mappers = snakeCaseMappers(opt);
          expect(mappers.format({ [camel]: 1 })).to.eql({ [snake]: 1 });

          const knexMappers = knexSnakeCaseMappers(opt);
          expect(knexMappers.wrapIdentifier(camel, (id) => id)).to.equal(snake);
          expect(knexMappers.postProcessResponse({ [snake]: 1 })).to.eql({ [backToCamel]: 1 });
        });
      }
    });

    describe('snakeCaseMappers and field expressions', () => {
      it('maps json keys of field expressions by default (unchanged behaviour)', () => {
        const mappers = snakeCaseMappers();

        expect(
          mappers.format({
            'jsonCol:[0][innerKey]': 1,
            'jsonCol:someKey.otherKey': 2,
            fooBar: 3,
          }),
        ).to.eql({
          'json_col:[0][inner_key]': 1,
          'json_col:some_key.other_key': 2,
          foo_bar: 3,
        });
      });

      it('only maps the column part of field expressions with `preserveJsonKeys: true`', () => {
        const mappers = snakeCaseMappers({ preserveJsonKeys: true });

        expect(
          mappers.format({
            'jsonCol:[0][innerKey]': 1,
            'jsonCol:someKey.otherKey': 2,
            'jsonCol:[a:bC]': 3,
            'json_col:someKey': 4,
            fooBar: 5,
          }),
        ).to.eql({
          'json_col:[0][innerKey]': 1,
          'json_col:someKey.otherKey': 2,
          'json_col:[a:bC]': 3,
          'json_col:someKey': 4,
          foo_bar: 5,
        });
      });

      it('combines `preserveJsonKeys` with other options', () => {
        const mappers = snakeCaseMappers({ preserveJsonKeys: true, upperCase: true });

        expect(mappers.format({ 'jsonCol:someKey': 1, fooBar: 2 })).to.eql({
          'JSON_COL:someKey': 1,
          FOO_BAR: 2,
        });
      });

      it('`preserveJsonKeys` does not affect parse', () => {
        const mappers = snakeCaseMappers({ preserveJsonKeys: true });

        expect(mappers.parse({ foo_bar: 1, 'rel:some_prop': 2 })).to.eql(
          snakeCaseMappers().parse({ foo_bar: 1, 'rel:some_prop': 2 }),
        );
      });
    });

    describe('knex mappers', () => {
      it('only map the top level keys', () => {
        const date = new Date();
        const mappers = knexSnakeCaseMappers();

        expect(
          mappers.postProcessResponse([
            {
              some_table: { id: 1, foo_bar: 'a', created_at: date },
              json_col: { foo_bar: 1 },
            },
          ]),
        ).to.eql([
          {
            someTable: { id: 1, foo_bar: 'a', created_at: date },
            jsonCol: { foo_bar: 1 },
          },
        ]);
      });
    });
  });

  describe('promiseUtils', () => {
    describe('map', () => {
      it('should work like Promise.all if concurrency is not given', () => {
        const numItems = 20;
        let running = 0;
        let maxRunning = 0;
        let startOrder = [];

        return map(range(numItems), (item, index) => {
          startOrder.push(item);
          running++;
          maxRunning = Math.max(maxRunning, running);

          return delay(Math.round(Math.random() * 10))
            .then(() => 2 * item)
            .then((result) => {
              --running;
              return result;
            });
        }).then((result) => {
          expect(maxRunning).to.equal(numItems);
          expect(result).to.eql(range(numItems).map((it) => it * 2));
          expect(startOrder).to.eql(range(numItems));
        });
      });

      it('should not start new operations after an error has been thrown', (done) => {
        const numItems = 20;

        let errorThrown = false;
        let callbackCalledAfterError = false;

        map(range(numItems), (item, index) => {
          if (errorThrown) {
            callbackCalledAfterError = true;
          }

          return delay(Math.round(Math.random() * 10)).then(() => {
            if (index === 10) {
              errorThrown = true;
              throw new Error('fail');
            } else {
              return item;
            }
          });
        })
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch((err) => {
            expect(err.message).to.equal('fail');
            expect(callbackCalledAfterError).to.equal(false);
            done();
          })
          .catch(done);
      });

      it('should only run opt.concurrency operations at a time', () => {
        const concurrency = 4;
        const numItems = 20;

        let running = 0;
        let startOrder = [];

        return map(
          range(numItems),
          (item, index) => {
            startOrder.push(item);
            running++;
            expect(running).to.be.lessThan(concurrency + 1);

            return delay(Math.round(Math.random() * 10))
              .then(() => 2 * item)
              .then((result) => {
                --running;
                return result;
              });
          },
          { concurrency },
        ).then((result) => {
          expect(result).to.eql(range(numItems).map((it) => it * 2));
          expect(startOrder).to.eql(range(numItems));
        });
      });

      it('should work with synchronous callbacks', () => {
        const concurrency = 4;
        const numItems = 20;
        let startOrder = [];

        return map(
          range(numItems),
          (item, index) => {
            startOrder.push(item);
            return 2 * item;
          },
          { concurrency },
        ).then((result) => {
          expect(result).to.eql(range(numItems).map((it) => it * 2));
          expect(startOrder).to.eql(range(numItems));
        });
      });
    });
  });

  describe('cloneDeep', () => {
    it('clones nested objects and arrays', () => {
      const value = { a: 1, b: { c: [1, { d: 'x' }] }, e: null };
      const clone = cloneDeep(value);

      expect(clone).to.eql(value);
      expect(clone).not.to.be(value);
      expect(clone.b).not.to.be(value.b);
      expect(clone.b.c).not.to.be(value.b.c);
      expect(clone.b.c[1]).not.to.be(value.b.c[1]);
    });

    it('keeps the prototype of class instances', () => {
      class Point {
        constructor(x) {
          this.x = x;
        }
      }

      const clone = cloneDeep({ point: new Point(1) });

      expect(clone.point).to.be.a(Point);
      expect(clone.point.x).to.equal(1);
    });

    it('keeps null prototypes', () => {
      const clone = cloneDeep(Object.assign(Object.create(null), { a: 1 }));

      expect(Object.getPrototypeOf(clone)).to.be(null);
      expect(clone.a).to.equal(1);
    });

    it('copies own enumerable properties, including symbols', () => {
      const symbol = Symbol('symbol');
      const value = Object.defineProperty({ a: 1, [symbol]: { b: 2 } }, 'hidden', {
        value: 3,
        enumerable: false,
      });
      const clone = cloneDeep(value);

      expect(clone[symbol]).to.eql({ b: 2 });
      expect(clone[symbol]).not.to.be(value[symbol]);
      expect(clone).not.to.have.property('hidden');
    });

    it('copies a `__proto__` key as a property', () => {
      const clone = cloneDeep(JSON.parse('{ "__proto__": { "x": 1 } }'));

      expect(Object.getPrototypeOf(clone)).to.be(Object.prototype);
      expect(clone.x).to.be(undefined);
      expect(Object.keys(clone)).to.eql(['__proto__']);
    });

    it('clones dates, regular expressions, maps, sets and binary data', () => {
      const key = { key: true };
      const regExp = /a+/g;
      regExp.lastIndex = 2;

      const value = {
        date: new Date(1000),
        regExp,
        map: new Map([[key, { a: 1 }]]),
        set: new Set([{ b: 2 }]),
        buffer: Buffer.from('abc'),
        typedArray: new Uint8Array([1, 2, 3]),
        arrayBuffer: new Uint8Array([4, 5]).buffer,
        dataView: new DataView(new Uint8Array([6, 7, 8]).buffer, 1, 2),
      };

      const clone = cloneDeep(value);

      expect(clone.date).not.to.be(value.date);
      expect(clone.date.getTime()).to.equal(1000);
      expect(clone.regExp).not.to.be(value.regExp);
      expect(String(clone.regExp)).to.equal('/a+/g');
      expect(clone.regExp.lastIndex).to.equal(2);
      expect(clone.map.get(key)).to.eql({ a: 1 });
      expect(clone.map.get(key)).not.to.be(value.map.get(key));
      expect([...clone.set]).to.eql([{ b: 2 }]);
      expect([...clone.set][0]).not.to.be([...value.set][0]);
      expect(Buffer.isBuffer(clone.buffer)).to.equal(true);
      expect(clone.buffer.toString()).to.equal('abc');
      expect(clone.buffer).not.to.be(value.buffer);
      expect([...clone.typedArray]).to.eql([1, 2, 3]);
      expect(clone.typedArray.buffer).not.to.be(value.typedArray.buffer);
      expect([...new Uint8Array(clone.arrayBuffer)]).to.eql([4, 5]);
      expect(clone.arrayBuffer).not.to.be(value.arrayBuffer);
      expect(clone.dataView.getUint8(0)).to.equal(7);
      expect(clone.dataView.byteLength).to.equal(2);
      expect(clone.dataView.buffer).not.to.be(value.dataView.buffer);
    });

    it('keeps circular and shared references', () => {
      const shared = { shared: true };
      const value = { x: shared, y: [shared] };
      value.self = value;

      const clone = cloneDeep(value);

      expect(clone.self).to.be(clone);
      expect(clone.x).to.be(clone.y[0]);
      expect(clone.x).not.to.be(shared);
    });

    it("keeps values it can't clone", () => {
      const value = { fn() {}, error: new Error('error'), weakMap: new WeakMap() };
      const clone = cloneDeep(value);

      expect(clone.fn).to.be(value.fn);
      expect(clone.error).to.be(value.error);
      expect(clone.weakMap).to.be(value.weakMap);
    });
  });

  describe('jsonEquals', () => {
    it('should work with primitives', () => {
      expect(jsonEquals(1, 1)).to.equal(true);
      expect(jsonEquals('foo', 'foo')).to.equal(true);
      expect(jsonEquals(false, false)).to.equal(true);
      expect(jsonEquals(true, true)).to.equal(true);
      const date = new Date();
      expect(jsonEquals(date, date)).to.equal(true);
      expect(jsonEquals(date, new Date(date))).to.equal(true);
      expect(jsonEquals(new Date(date), date)).to.equal(true);

      expect(jsonEquals(1, 2)).to.equal(false);
      expect(jsonEquals('foo', 'bar')).to.equal(false);
      expect(jsonEquals(true, false)).to.equal(false);
      expect(jsonEquals(0, false)).to.equal(false);
      expect(jsonEquals(false, 0)).to.equal(false);
      expect(jsonEquals('1', 1)).to.equal(false);
      expect(jsonEquals(1, '1')).to.equal(false);
      expect(jsonEquals(true, false)).to.equal(false);
      expect(jsonEquals('true', true)).to.equal(false);
      expect(jsonEquals(true, 'true')).to.equal(false);
      expect(jsonEquals(new Date(), new Date(Date.now() + 1))).to.equal(false);
    });

    it('should work with arrays', () => {
      expect(jsonEquals([], [])).to.equal(true);
      expect(jsonEquals([1], [1])).to.equal(true);
      expect(jsonEquals([1, 2], [1, 2])).to.equal(true);
      expect(jsonEquals(['foo', 'bar'], ['foo', 'bar'])).to.equal(true);

      expect(jsonEquals(['1', 2], [1, '2'])).to.equal(false);
      expect(jsonEquals([1], 1)).to.equal(false);
      expect(jsonEquals(2, [2])).to.equal(false);
      expect(jsonEquals([0], [])).to.equal(false);
      expect(jsonEquals([], [0])).to.equal(false);
      expect(jsonEquals([1], [2])).to.equal(false);
      expect(jsonEquals([1, 2], [2, 1])).to.equal(false);
      expect(jsonEquals([1, 2], [1, 2, 3])).to.equal(false);
      expect(jsonEquals([1, 2, 3], [1, 2])).to.equal(false);
      expect(jsonEquals(['2', 2], [1, '2'])).to.equal(false);
    });

    it('should work with objects', () => {
      expect(jsonEquals({}, {})).to.equal(true);
      expect(jsonEquals({ a: 1, b: 2 }, { b: 2, a: 1 })).to.equal(true);
      expect(jsonEquals({ a: 1, b: 2 }, { b: 2, a: 2 })).to.equal(false);
      expect(jsonEquals({ a: 1, b: 2 }, { a: 1, b: 2, c: 3 })).to.equal(false);
      expect(jsonEquals({ a: 1, b: 2, c: 3 }, { a: 1, b: 2 })).to.equal(false);
    });

    it('should work with nested stuff', () => {
      expect(
        jsonEquals(
          {
            a: [1, { b: 'foo' }, false],
          },
          {
            a: [1, { b: 'foo' }, false],
          },
        ),
      ).to.equal(true);

      expect(
        jsonEquals(
          {
            a: [1, { b: 'foo' }, false],
          },
          {
            a: [1, { b: 'bar' }, false],
          },
        ),
      ).to.equal(false);

      expect(
        jsonEquals(
          {
            a: [1, { b: 'foo' }, false],
          },
          {
            a: [1, { b: 'foo' }, true],
          },
        ),
      ).to.equal(false);

      expect(
        jsonEquals(
          [
            {
              a: [1, { b: 'foo' }, false],
            },
            1,
          ],
          [
            {
              a: [1, { b: 'foo' }, false],
            },
            1,
          ],
        ),
      ).to.equal(true);

      expect(
        jsonEquals(
          [
            {
              a: [1, { b: 'foo' }, false],
            },
            1,
          ],
          [
            {
              a: ['1', { b: 'foo' }, false],
            },
            1,
          ],
        ),
      ).to.equal(false);
    });
  });
  describe('uniqBy', () => {
    const items = [
      [Buffer.from('00000000000000000000000000007AAD', 'hex')],
      [Buffer.from('00000000000000000000000000007AAE', 'hex')],
      [Buffer.from('00000000000000000000000000007AAC', 'hex')],
    ];
    it('should work with Buffer items', () => {
      const itemsForTest = items.map(([value]) => value);
      expect(uniqBy(itemsForTest)).to.eql(itemsForTest);
    });
    it('should work with Buffer[] items', () => {
      expect(uniqBy(items)).to.eql(items);
    });
    it('should work with Buffer[] items with custom keyGetter function', () => {
      expect(
        uniqBy(items, (item) =>
          item.map((x) => (Buffer.isBuffer(x) ? x.toString('hex') : x)).join(','),
        ),
      ).to.eql(items);
    });
  });

  describe('union', () => {
    it('does not keep duplicates from the first array', () => {
      expect(union([1, 1, 2], [2, 3])).to.eql([1, 2, 3]);
    });
  });
});
