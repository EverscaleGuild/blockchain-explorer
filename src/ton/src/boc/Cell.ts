import { Maybe } from '../types'
import { BitString } from './BitString'
import { deserializeBoc, getMaxDepth, getMaxLevel, hashCell, serializeToBoc } from './boc'
import inspectSymbol from 'symbol.inspect'
import { Slice } from '..'
import { CellType } from './CellType'

export class Cell {
  static fromBoc(src: Buffer | string): Cell[] {
    return deserializeBoc(typeof src === 'string' ? Buffer.from(src, 'hex') : src)
  }

  public bits: BitString
  readonly refs: Cell[] = []
  readonly kind: CellType

  get isExotic() {
    return this.kind !== 'ordinary'
  }

  constructor(kind: CellType = 'ordinary', bits = BitString.alloc(1023)) {
    this.kind = kind
    this.bits = bits
  }

  beginParse() {
    if (this.isExotic) {
      throw Error('Unable to parse exotic cell')
    }
    return Slice.fromCell(this)
  }

  writeCell(anotherCell: Cell) {
    this.bits.writeBitString(anotherCell.bits)
    for (const r of anotherCell.refs) {
      this.refs.push(r)
    }
  }

  hash() {
    return hashCell(this)
  }

  toBoc(opts?: {
    idx?: Maybe<boolean>
    crc32?: Maybe<boolean>
    cacheBits?: Maybe<boolean>
    flags?: Maybe<number>
  }) {
    const idx = opts && opts.idx !== null && opts.idx !== undefined ? opts.idx : true
    const crc32 = opts && opts.crc32 !== null && opts.crc32 !== undefined ? opts.crc32 : true
    const cacheBits =
      opts && opts.cacheBits !== null && opts.cacheBits !== undefined ? opts.cacheBits : false
    const flags = opts && opts.flags !== null && opts.flags !== undefined ? opts.flags : 0
    return serializeToBoc(this, idx, crc32, cacheBits, flags)
  }

  [inspectSymbol] = () => this.toString()

  toString(indent?: string): string {
    const id = indent || ''
    let s = id + 'x{' + this.bits.toFiftHex() + '}\n'
    for (const k in this.refs) {
      const i = this.refs[k]
      s += i.toString(id + ' ')
    }
    return s
  }

  toDebugString(indent?: string): string {
    let id = indent || ''
    if (this.isExotic) {
      id += '(exotic)'
    }
    let s = id + 'x{' + this.bits.toFiftHex() + '}\n'
    for (const k in this.refs) {
      const i = this.refs[k]
      s += i.toString(id + ' ')
    }
    return s
  }

  withReference(cell: Cell) {
    this.refs.push(cell)
    return this
  }

  withData(src: string) {
    for (const s of src) {
      if (s === '0') {
        this.bits.writeBit(0)
      } else {
        this.bits.writeBit(1)
      }
    }
    return this
  }

  equals(src: Cell) {
    if (src.refs.length !== this.refs.length) {
      return false
    }
    for (let i = 0; i < src.refs.length; i++) {
      if (!src.refs[i].equals(this.refs[i])) {
        return false
      }
    }
    return this.bits.equals(src.bits)
  }

  getMaxLevel() {
    return getMaxLevel(this)
  }

  getMaxDepth() {
    return getMaxDepth(this)
  }
}
