import { createContext, useContext } from 'react'
import type { DecorUrls } from '../lib/decor'

/** 밍석이 넣은 꾸미기 사진 주소들 (App이 채움) */
export const DecorContext = createContext<DecorUrls>({})

export const useDecor = () => useContext(DecorContext)
