// https://gist.github.com/enriched/c84a2a99f886654149908091a3183e15

/**
 * MIT License
 *
 * Copyright (c) 2016 Richard Adams (https://github.com/enriched)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
declare module 'jsonschema' {

  export interface JsonSchema {
    $ref?: string
    /////////////////////////////////////////////////
    // Schema Metadata
    /////////////////////////////////////////////////
    /**
     * This is important because it tells refs where
     * the root of the document is located
     */
    id?: string
    /**
     * It is recommended that the meta-schema is
     * included in the root of any JSON Schema
     */
    $schema?: JsonSchema
    /**
     * Title of the schema
     */
    title?: string
    /**
     * Schema description
     */
    description?: string
    /**
     * Default json for the object represented by
     * this schema
     */
    default?: any

    /////////////////////////////////////////////////
    // Number Validation
    /////////////////////////////////////////////////
    /**
     * The value must be a multiple of the number
     * (e.g. 10 is a multiple of 5)
     */
    multipleOf?: number
    maximum?: number
    /**
     * If true maximum must be > value, >= otherwise
     */
    exclusiveMaximum?: boolean
    minimum?: number
    /**
     * If true minimum must be < value, <= otherwise
     */
    exclusiveMinimum?: boolean

    /////////////////////////////////////////////////
    // String Validation
    /////////////////////////////////////////////////
    maxLength?: number
    minLength?: number
    /**
     * This is a regex string that the value must
     * conform to
     */
    pattern?: string

    /////////////////////////////////////////////////
    // Array Validation
    /////////////////////////////////////////////////
    additionalItems?: boolean | JsonSchema
    items?: JsonSchema | JsonSchema[]
    maxItems?: number
    minItems?: number
    uniqueItems?: boolean

    /////////////////////////////////////////////////
    // Object Validation
    /////////////////////////////////////////////////
    maxProperties?: number
    minProperties?: number
    required?: string[]
    additionalProperties?: boolean | JsonSchema
    /**
     * Holds simple JSON Schema definitions for
     * referencing from elsewhere.
     */
    definitions?: { [key: string]: JsonSchema }
    /**
     * The keys that can exist on the object with the
     * json schema that should validate their value
     */
    properties?: { [property: string]: JsonSchema }
    /**
     * The key of this object is a regex for which
     * properties the schema applies to
     */
    patternProperties?: { [pattern: string]: JsonSchema }
    /**
     * If the key is present as a property then the
     * string of properties must also be present.
     * If the value is a JSON Schema then it must
     * also be valid for the object if the key is
     * present.
     */
    dependencies?: { [key: string]: JsonSchema | string[] }

    /////////////////////////////////////////////////
    // Generic
    /////////////////////////////////////////////////
    /**
     * Enumerates the values that this schema can be
     * e.g.
     * {"type": "string",
     *  "enum": ["red", "green", "blue"]}
     */
    enum?: any[]
    /**
     * The basic type of this schema, can be one of
     * [string, number, object, array, boolean, null]
     * or an array of the acceptable types
     */
    type?: string | string[]

    /////////////////////////////////////////////////
    // Combining Schemas
    /////////////////////////////////////////////////
    allOf?: JsonSchema[]
    anyOf?: JsonSchema[]
    oneOf?: JsonSchema[]
    /**
     * The entity being validated must not match this schema
     */
    not?: JsonSchema
  }
}