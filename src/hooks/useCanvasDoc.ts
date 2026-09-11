'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { CanvasElement } from '@/types/canvas';

export interface UseCanvasDocReturn {
  elements: CanvasElement[];
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, partial: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  deleteElements: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  doc: Y.Doc;
}

export function useCanvasDoc(initialElements: CanvasElement[] = []): UseCanvasDocReturn {
  // Stable reference to local Y.Doc instance
  const docRef = useRef<Y.Doc | null>(null);
  const elementsMapRef = useRef<Y.Map<CanvasElement> | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const localOriginRef = useRef<string>('local-client');

  const [elements, setElements] = useState<CanvasElement[]>(initialElements);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Initialize Y.Doc, Y.Map, and Y.UndoManager once
  if (!docRef.current) {
    const doc = new Y.Doc();
    const elementsMap = doc.getMap<CanvasElement>('elements');
    const localOrigin = localOriginRef.current;

    // Track transactions authored with localOrigin with discrete action capture
    const undoManager = new Y.UndoManager(elementsMap, {
      trackedOrigins: new Set([localOrigin]),
      captureTimeout: 0,
    });

    // Populate initial elements if provided
    if (initialElements.length > 0) {
      doc.transact(() => {
        for (const el of initialElements) {
          elementsMap.set(el.id, el);
        }
      }, localOrigin);
    }

    docRef.current = doc;
    elementsMapRef.current = elementsMap;
    undoManagerRef.current = undoManager;
  }

  // Subscribe to changes and undo/redo events
  useEffect(() => {
    const elementsMap = elementsMapRef.current;
    const undoManager = undoManagerRef.current;
    if (!elementsMap || !undoManager) return;

    const syncElementsFromMap = () => {
      const arr: CanvasElement[] = [];
      elementsMap.forEach((val) => {
        if (!val.isDeleted) {
          arr.push(val);
        }
      });
      // Sort by creation time so z-index order is consistent
      arr.sort((a, b) => a.createdAt - b.createdAt);
      setElements(arr);
    };

    const updateUndoRedoState = () => {
      setCanUndo(undoManager.undoStack.length > 0);
      setCanRedo(undoManager.redoStack.length > 0);
    };

    // Initial sync
    syncElementsFromMap();
    updateUndoRedoState();

    // Listen to Y.Map changes
    const mapObserver = () => {
      syncElementsFromMap();
      updateUndoRedoState();
    };

    const undoObserver = () => {
      updateUndoRedoState();
    };

    elementsMap.observe(mapObserver);
    undoManager.on('stack-item-added', undoObserver);
    undoManager.on('stack-item-popped', undoObserver);
    undoManager.on('stack-cleared', undoObserver);

    return () => {
      elementsMap.unobserve(mapObserver);
      undoManager.off('stack-item-added', undoObserver);
      undoManager.off('stack-item-popped', undoObserver);
      undoManager.off('stack-cleared', undoObserver);
    };
  }, []);

  // Add Element
  const addElement = useCallback((element: CanvasElement) => {
    const doc = docRef.current;
    const elementsMap = elementsMapRef.current;
    if (!doc || !elementsMap) return;

    doc.transact(() => {
      elementsMap.set(element.id, element);
    }, localOriginRef.current);
  }, []);

  // Update Element
  const updateElement = useCallback((id: string, partial: Partial<CanvasElement>) => {
    const doc = docRef.current;
    const elementsMap = elementsMapRef.current;
    if (!doc || !elementsMap) return;

    const existing = elementsMap.get(id);
    if (!existing) return;

    doc.transact(() => {
      elementsMap.set(id, {
        ...existing,
        ...partial,
        updatedAt: Date.now(),
      });
    }, localOriginRef.current);
  }, []);

  // Delete Single Element
  const deleteElement = useCallback((id: string) => {
    const doc = docRef.current;
    const elementsMap = elementsMapRef.current;
    if (!doc || !elementsMap) return;

    doc.transact(() => {
      elementsMap.delete(id);
    }, localOriginRef.current);
  }, []);

  // Delete Multiple Elements
  const deleteElements = useCallback((ids: string[]) => {
    const doc = docRef.current;
    const elementsMap = elementsMapRef.current;
    if (!doc || !elementsMap || ids.length === 0) return;

    doc.transact(() => {
      for (const id of ids) {
        elementsMap.delete(id);
      }
    }, localOriginRef.current);
  }, []);

  // Undo
  const undo = useCallback(() => {
    const undoManager = undoManagerRef.current;
    if (undoManager && undoManager.undoStack.length > 0) {
      undoManager.undo();
    }
  }, []);

  // Redo
  const redo = useCallback(() => {
    const undoManager = undoManagerRef.current;
    if (undoManager && undoManager.redoStack.length > 0) {
      undoManager.redo();
    }
  }, []);

  return {
    elements,
    addElement,
    updateElement,
    deleteElement,
    deleteElements,
    undo,
    redo,
    canUndo,
    canRedo,
    doc: docRef.current!,
  };
}
