import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
// @ts-ignore
import TextInputComponent from 'ink-text-input';
const TextInput = (TextInputComponent as any).default || TextInputComponent;
import type { DatabaseAdapter, Product } from '../../types/index.ts';

export interface ManageViewProps {
  db: DatabaseAdapter;
  setStatus: (msg: string, type?: 'info' | 'success' | 'error') => void;
  isActive: boolean;
}

type Mode = 'list' | 'add' | 'edit' | 'delete-confirm';

interface FormState {
  title: string;
  category: string;
  price: string;
  stock: string;
  brand: string;
  description: string;
}

const INITIAL_FORM: FormState = {
  title: '',
  category: 'general',
  price: '19.99',
  stock: '25',
  brand: '',
  description: ''
};

export const ManageView: React.FC<ManageViewProps> = ({
  db,
  setStatus,
  isActive
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<Mode>('list');
  const [activeField, setActiveField] = useState<number>(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);

  const fields: Array<keyof FormState> = ['title', 'category', 'price', 'stock', 'brand', 'description'];

  const loadProducts = useCallback(async () => {
    try {
      const res = await db.getProducts({ page, limit: 8 });
      setProducts(res.items);
      setTotalPages(res.totalPages);
      if (selectedIndex >= res.items.length) {
        setSelectedIndex(Math.max(0, res.items.length - 1));
      }
    } catch (err: any) {
      setStatus(`Error loading products: ${err.message}`, 'error');
    }
  }, [db, page, selectedIndex, setStatus]);

  useEffect(() => {
    if (!isActive) return;
    loadProducts();
  }, [isActive, loadProducts]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      setStatus('Product title cannot be empty!', 'error');
      return;
    }
    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum < 0) {
      setStatus('Price must be a valid positive number!', 'error');
      return;
    }
    const stockNum = parseInt(form.stock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      setStatus('Stock must be a valid integer!', 'error');
      return;
    }

    try {
      if (mode === 'add') {
        const created = await db.createProduct({
          title: form.title.trim(),
          category: form.category.trim() || 'general',
          price: priceNum,
          stock: stockNum,
          brand: form.brand.trim() || undefined,
          description: form.description.trim() || undefined
        });
        setStatus(`Created product #${created.id} "${created.title}" successfully!`, 'success');
      } else if (mode === 'edit' && editingId) {
        await db.updateProduct(editingId, {
          title: form.title.trim(),
          category: form.category.trim() || 'general',
          price: priceNum,
          stock: stockNum,
          brand: form.brand.trim() || undefined,
          description: form.description.trim() || undefined
        });
        setStatus(`Updated product #${editingId} successfully!`, 'success');
      }
      setMode('list');
      setForm(INITIAL_FORM);
      setEditingId(null);
      await loadProducts();
    } catch (err: any) {
      setStatus(`Failed to save product: ${err.message}`, 'error');
    }
  };

  const handleDelete = async () => {
    const selected = products[selectedIndex];
    if (!selected) return;
    try {
      await db.deleteProduct(selected.id);
      setStatus(`Deleted product #${selected.id} "${selected.title}"`, 'success');
      setMode('list');
      await loadProducts();
    } catch (err: any) {
      setStatus(`Failed to delete: ${err.message}`, 'error');
    }
  };

  useInput((input, key) => {
    if (!isActive) return;

    if (mode === 'delete-confirm') {
      if (input === 'y' || input === 'Y' || key.return) {
        handleDelete();
      } else if (input === 'n' || input === 'N' || key.escape) {
        setMode('list');
      }
      return;
    }

    if (mode === 'add' || mode === 'edit') {
      if (key.escape) {
        setMode('list');
        return;
      }
      if (key.tab) {
        if (key.shift) {
          setActiveField(prev => (prev > 0 ? prev - 1 : fields.length));
        } else {
          setActiveField(prev => (prev < fields.length ? prev + 1 : 0));
        }
        return;
      }
      if (key.return && activeField === fields.length) {
        // Hit enter on Submit button
        handleSave();
        return;
      }
      return;
    }

    // List mode
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(products.length - 1, prev + 1));
    } else if (input === 'n' || input === 'N') {
      setForm(INITIAL_FORM);
      setActiveField(0);
      setMode('add');
    } else if (input === 'e' || input === 'E') {
      const selected = products[selectedIndex];
      if (selected) {
        setForm({
          title: selected.title,
          category: selected.category,
          price: String(selected.price),
          stock: String(selected.stock),
          brand: selected.brand || '',
          description: selected.description || ''
        });
        setEditingId(selected.id);
        setActiveField(0);
        setMode('edit');
      }
    } else if (input === 'd' || input === 'D') {
      if (products[selectedIndex]) {
        setMode('delete-confirm');
      }
    } else if (key.rightArrow) {
      if (page < totalPages) setPage(p => p + 1);
    } else if (key.leftArrow) {
      if (page > 1) setPage(p => p - 1);
    }
  });

  if (mode === 'delete-confirm') {
    const selected = products[selectedIndex];
    return (
      <Box flexDirection="column" borderStyle="double" borderColor="red" padding={1}>
        <Text bold color="red">⚠️ CONFIRM PRODUCT DELETION</Text>
        <Box marginY={1}>
          <Text>
            Are you sure you want to delete <Text bold color="yellow">#{selected?.id}: {selected?.title}</Text>?
          </Text>
        </Box>
        <Box gap={2}>
          <Text color="red" bold>[Y / Enter] Confirm Delete</Text>
          <Text color="gray">[N / Esc] Cancel</Text>
        </Box>
      </Box>
    );
  }

  if (mode === 'add' || mode === 'edit') {
    return (
      <Box flexDirection="column" borderStyle="single" borderColor="cyan" padding={1}>
        <Text bold color="cyan">
          {mode === 'add' ? '➕ ADD NEW PRODUCT' : `✏️ EDIT PRODUCT #${editingId}`}
        </Text>
        <Text color="gray">Use [Tab] to cycle between fields, then Enter on [Save Product] or [Esc] to cancel.</Text>

        <Box flexDirection="column" marginTop={1} gap={0}>
          {fields.map((f, idx) => {
            const isFieldActive = activeField === idx;
            return (
              <Box key={f} marginY={0}>
                <Box width={16}>
                  <Text bold={isFieldActive} color={isFieldActive ? 'green' : 'white'}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}:
                  </Text>
                </Box>
                {isFieldActive ? (
                  <TextInput
                    value={form[f]}
                    onChange={(val: string) => setForm(prev => ({ ...prev, [f]: val }))}
                  />
                ) : (
                  <Text color={form[f] ? 'white' : 'gray'}>
                    {form[f] || '<empty>'}
                  </Text>
                )}
              </Box>
            );
          })}
        </Box>

        <Box marginTop={1} gap={2}>
          <Box borderStyle="round" borderColor={activeField === fields.length ? 'green' : 'gray'} paddingX={1}>
            <Text bold color={activeField === fields.length ? 'green' : 'gray'}>
              💾 [Press Enter here to Save]
            </Text>
          </Box>
          <Text color="gray">[Esc] Cancel</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between" marginBottom={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text bold color="cyan">Product Inventory & CRUD Management</Text>
        <Box gap={2}>
          <Text color="green" bold>[N] Add New</Text>
          <Text color="yellow" bold>[E] Edit</Text>
          <Text color="red" bold>[D] Delete</Text>
        </Box>
      </Box>

      {/* Table Header */}
      <Box borderStyle="single" borderColor="blue" paddingX={1}>
        <Box width="6%"><Text bold color="blue">ID</Text></Box>
        <Box width="38%"><Text bold color="blue">Title</Text></Box>
        <Box width="18%"><Text bold color="blue">Category</Text></Box>
        <Box width="14%"><Text bold color="blue">Price</Text></Box>
        <Box width="14%"><Text bold color="blue">Stock</Text></Box>
        <Box width="10%"><Text bold color="blue">Action</Text></Box>
      </Box>

      {/* Rows */}
      {products.length === 0 ? (
        <Box padding={1} justifyContent="center">
          <Text color="gray">No products in database. Press [N] to add one or Tab 5 to seed.</Text>
        </Box>
      ) : (
        products.map((p, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <Box key={p.id} paddingX={1} backgroundColor={isSelected ? 'gray' : undefined}>
              <Box width="6%"><Text bold={isSelected} color={isSelected ? 'cyan' : undefined}>#{p.id}</Text></Box>
              <Box width="38%">
                <Text bold={isSelected} color={isSelected ? 'white' : undefined}>
                  {p.title.length > 34 ? `${p.title.substring(0, 31)}...` : p.title}
                </Text>
              </Box>
              <Box width="18%"><Text color="yellow">{p.category}</Text></Box>
              <Box width="14%"><Text bold color="green">${p.price.toFixed(2)}</Text></Box>
              <Box width="14%">
                <Text color={p.stock > 10 ? 'green' : p.stock > 0 ? 'yellow' : 'red'}>
                  {p.stock} units
                </Text>
              </Box>
              <Box width="10%">
                <Text color="gray">[E / D]</Text>
              </Box>
            </Box>
          );
        })
      )}

      {/* Pagination Footer */}
      <Box justifyContent="space-between" marginTop={1} paddingX={1}>
        <Box gap={1}>
          <Text color="yellow">[↑/↓]</Text><Text color="gray">Select</Text>
          <Text color="yellow">[N]</Text><Text color="gray">Create</Text>
          <Text color="yellow">[E]</Text><Text color="gray">Edit</Text>
          <Text color="yellow">[D]</Text><Text color="gray">Delete</Text>
        </Box>
        <Box gap={1}>
          <Text color="cyan">[←] Prev</Text>
          <Text bold color="white">Page {page} of {totalPages}</Text>
          <Text color="cyan">[→] Next</Text>
        </Box>
      </Box>
    </Box>
  );
};
