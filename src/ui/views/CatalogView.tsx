import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
// @ts-ignore ink-text-input type resolution
import TextInputComponent from 'ink-text-input';
const TextInput = (TextInputComponent as any).default || TextInputComponent;
import type { DatabaseAdapter, Product } from '../../types/index.ts';

export interface CatalogViewProps {
  db: DatabaseAdapter;
  onAddToCart: (product: Product) => void;
  setStatus: (msg: string, type?: 'info' | 'success' | 'error') => void;
  isActive: boolean;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  db,
  onAddToCart,
  setStatus,
  isActive
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [inspectProduct, setInspectProduct] = useState<Product | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      const res = await db.getProducts({
        search: searchQuery,
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        page,
        limit: 8
      });
      setProducts(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      if (selectedIndex >= res.items.length) {
        setSelectedIndex(Math.max(0, res.items.length - 1));
      }
    } catch (err: any) {
      setStatus(`Failed to load products: ${err.message}`, 'error');
    }
  }, [db, searchQuery, selectedCategory, page, selectedIndex, setStatus]);

  useEffect(() => {
    if (!isActive) return;
    loadProducts();
  }, [isActive, loadProducts]);

  useEffect(() => {
    if (!isActive) return;
    db.getCategories().then(cats => setCategories(['ALL', ...cats])).catch(() => {});
  }, [isActive, db]);

  useInput((input, key) => {
    if (!isActive) return;

    if (inspectProduct) {
      if (key.escape || input === 'b' || input === 'q' || key.return) {
        setInspectProduct(null);
      } else if (input === 'a' || input === 'A') {
        onAddToCart(inspectProduct);
        setStatus(`Added "${inspectProduct.title}" to cart!`, 'success');
        setInspectProduct(null);
      }
      return;
    }

    if (isSearching) {
      if (key.return || key.escape) {
        setIsSearching(false);
        setPage(1);
        loadProducts();
      }
      return;
    }

    // Normal navigation
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(products.length - 1, prev + 1));
    } else if (input === 's' || input === '/') {
      setIsSearching(true);
    } else if (input === 'c' || input === 'C') {
      // Cycle categories
      if (categories.length > 0) {
        const curIdx = categories.indexOf(selectedCategory);
        const nextCat = categories[(curIdx + 1) % categories.length]!;
        setSelectedCategory(nextCat);
        setPage(1);
      }
    } else if (input === 'n' || input === 'N' || key.rightArrow) {
      if (page < totalPages) setPage(p => p + 1);
    } else if (input === 'p' || input === 'P' || key.leftArrow) {
      if (page > 1) setPage(p => p - 1);
    } else if (input === 'a' || input === 'A') {
      const selected = products[selectedIndex];
      if (selected) {
        if (selected.stock <= 0) {
          setStatus(`"${selected.title}" is out of stock!`, 'error');
        } else {
          onAddToCart(selected);
          setStatus(`Added "${selected.title}" to cart!`, 'success');
        }
      }
    } else if (key.return) {
      const selected = products[selectedIndex];
      if (selected) setInspectProduct(selected);
    }
  });

  if (inspectProduct) {
    return (
      <Box flexDirection="column" borderStyle="double" borderColor="cyan" padding={1}>
        <Text bold color="cyan">🔍 PRODUCT DETAILS: {inspectProduct.title}</Text>
        <Box marginTop={1} flexDirection="column" gap={0}>
          <Text><Text bold>ID: </Text>#{inspectProduct.id}</Text>
          <Text><Text bold>Category: </Text><Text color="yellow">{inspectProduct.category}</Text></Text>
          <Text><Text bold>Brand: </Text>{inspectProduct.brand || 'N/A'}</Text>
          <Text><Text bold>SKU: </Text>{inspectProduct.sku || 'N/A'}</Text>
          <Text><Text bold>Price: </Text><Text color="green" bold>${inspectProduct.price.toFixed(2)}</Text> {inspectProduct.discountPercentage ? `(${inspectProduct.discountPercentage}% OFF)` : ''}</Text>
          <Text><Text bold>Rating: </Text>⭐ {inspectProduct.rating || 0}/5</Text>
          <Text><Text bold>Stock: </Text><Text color={inspectProduct.stock > 10 ? 'green' : inspectProduct.stock > 0 ? 'yellow' : 'red'}>{inspectProduct.stock} units available</Text></Text>
          <Box marginTop={1}>
            <Text bold>Description: </Text>
          </Box>
          <Text color="gray">{inspectProduct.description || 'No description provided.'}</Text>
        </Box>
        <Box marginTop={1} gap={2}>
          <Text color="green" bold>[A] Add to Cart</Text>
          <Text color="gray">[Enter / Esc / B] Back to Catalog</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Search and Filter Controls */}
      <Box justifyContent="space-between" marginBottom={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Box>
          <Text bold color="cyan">Search: </Text>
          {isSearching ? (
            <TextInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={() => {
                setIsSearching(false);
                setPage(1);
                loadProducts();
              }}
            />
          ) : (
            <Text color={searchQuery ? 'white' : 'gray'}>
              {searchQuery || '<Press / or S to search>'}
            </Text>
          )}
        </Box>
        <Box gap={1}>
          <Text bold color="cyan">Category [C]: </Text>
          <Text color="yellow">{selectedCategory}</Text>
          <Text color="gray">({total} total)</Text>
        </Box>
      </Box>

      {/* Products Table Header */}
      <Box borderStyle="single" borderColor="blue" paddingX={1}>
        <Box width="6%"><Text bold color="blue">ID</Text></Box>
        <Box width="38%"><Text bold color="blue">Title</Text></Box>
        <Box width="18%"><Text bold color="blue">Category</Text></Box>
        <Box width="14%"><Text bold color="blue">Price</Text></Box>
        <Box width="10%"><Text bold color="blue">Rating</Text></Box>
        <Box width="14%"><Text bold color="blue">Stock</Text></Box>
      </Box>

      {/* Product Rows */}
      {products.length === 0 ? (
        <Box padding={1} justifyContent="center">
          <Text color="gray">No products found. Try changing filters or seed database in Tab 5.</Text>
        </Box>
      ) : (
        products.map((p, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <Box
              key={p.id}
              paddingX={1}
              backgroundColor={isSelected ? 'gray' : undefined}
            >
              <Box width="6%">
                <Text bold={isSelected} color={isSelected ? 'cyan' : undefined}>
                  #{p.id}
                </Text>
              </Box>
              <Box width="38%">
                <Text bold={isSelected} color={isSelected ? 'white' : undefined}>
                  {p.title.length > 34 ? `${p.title.substring(0, 31)}...` : p.title}
                </Text>
              </Box>
              <Box width="18%">
                <Text color="yellow">
                  {p.category.length > 15 ? `${p.category.substring(0, 13)}..` : p.category}
                </Text>
              </Box>
              <Box width="14%">
                <Text bold color="green">
                  ${p.price.toFixed(2)}
                </Text>
              </Box>
              <Box width="10%">
                <Text color="yellow">
                  ★ {p.rating ? p.rating.toFixed(1) : '-'}
                </Text>
              </Box>
              <Box width="14%">
                <Text color={p.stock > 10 ? 'green' : p.stock > 0 ? 'yellow' : 'red'}>
                  {p.stock > 0 ? `${p.stock} in stock` : 'Out of Stock'}
                </Text>
              </Box>
            </Box>
          );
        })
      )}

      {/* Table Pagination & Quick Actions */}
      <Box justifyContent="space-between" marginTop={1} paddingX={1}>
        <Box gap={1}>
          <Text color="yellow">[↑/↓]</Text><Text color="gray">Select</Text>
          <Text color="yellow">[Enter]</Text><Text color="gray">Details</Text>
          <Text color="yellow">[A]</Text><Text color="gray">Add to Cart</Text>
          <Text color="yellow">[/]</Text><Text color="gray">Search</Text>
          <Text color="yellow">[C]</Text><Text color="gray">Category</Text>
        </Box>
        <Box gap={1}>
          <Text color="cyan">[P] Prev</Text>
          <Text bold color="white">Page {page} of {totalPages}</Text>
          <Text color="cyan">[N] Next</Text>
        </Box>
      </Box>
    </Box>
  );
};
