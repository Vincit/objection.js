declare function isInternalProp(propName: string): boolean;

declare function getTempColumn(index: number): string;
declare function isTempColumn(col: string): boolean;

export { getTempColumn, isInternalProp, isTempColumn };
