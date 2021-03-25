import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const prevCartRef = useRef<Product[]>();
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  useEffect(() => {
    prevCartRef.current = cart;
  });
  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get(`http://localhost:3333/stock/${productId}`)

      if (stockResponse.status === 404) {
        toast.error('Erro na adição do produto');
      } else {

        const productInCart = cart.filter((product: Product) => product.id === productId)

        if (productInCart.length > 0) {
          const amount = productInCart[0].amount + 1
          updateProductAmount({ productId, amount })
        } else {
          const productResponse = await api.get(`http://localhost:3333/products/${productId}`)
          if (stockResponse.data.amount > 0) {
            const newProduct = productResponse.data
            newProduct.amount = 1
            setCart([...cart, newProduct])
          } else {
            toast.error('Quantidade solicitada fora de estoque');
          }
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const currentCart = cart.filter((product: Product) => product.id === productId)
      const newCart = cart.filter((product: Product) => product.id !== productId)

      if (currentCart.length > 0) {
        setCart(newCart)
      } else {
        toast.error('Erro na remoção do produto');
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if (amount <= 0) {
        return null
      }

      const stockResponse = await api.get(`http://localhost:3333/stock/${productId}`)

      if (stockResponse.data.amount >= amount) {
        const newCart = cart.map((product: Product) => {
          if (product.id === productId) {
            product.amount = amount
          }
          return product
        })

        setCart(newCart)

      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
