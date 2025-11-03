// src/store/product.js
import { create } from 'zustand'

const useProductStore = create((set) => ({
  products: [],
  loading: false,

  fetchProducts: async () => {
    set({ loading: true })
    // placeholder: fetch from API later
    const demo = [{ id: 1, name: 'Demo Product' }]
    set({ products: demo, loading: false })
  },

  createProduct: (p) =>
    set((state) => ({ products: [...state.products, p] })),
}))

export default useProductStore
