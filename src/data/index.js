import n5 from './grammar-n5.json'
import n4 from './grammar-n4.json'
import n3 from './grammar-n3.json'
import n2 from './grammar-n2.json'
import n1 from './grammar-n1.json'

export const allGrammar = [...n5, ...n4, ...n3, ...n2, ...n1]

export const grammarByLevel = {
  N5: n5,
  N4: n4,
  N3: n3,
  N2: n2,
  N1: n1,
}

export const levels = ['N5', 'N4', 'N3', 'N2', 'N1']
