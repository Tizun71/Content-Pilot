import React, { useRef, useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  Background,
  useReactFlow,
} from 'reactflow';
import { InputNode, SearchNode, WriteNode, ImageNode, OutputNode, PreviewNode, PublisherNode, DeletableEdge } from './components/ModuleComponents';
import { FlowHeader } from './components/FlowHeader';
import { CommandBar } from './components/CommandBar';
import { InspectorDrawer } from './components/InspectorDrawer';
import { NotificationToast, NotificationItem, NotificationType } from './components/NotificationToast';
import { useFlowController } from './hooks/useFlowController';

// Register Node Types
const nodeTypes = {
  INPUT: InputNode,
  SEARCH: SearchNode,
  WRITE: WriteNode,
  IMAGE: ImageNode,
  PREVIEW: PreviewNode,
  PUBLISHER: PublisherNode,
  OUTPUT: OutputNode,
};

// Register Edge Types
const edgeTypes = {
  default: DeletableEdge,
};

const FlowEditor = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // -- Notification State Management --
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = useCallback((type: NotificationType, message: string) => {
    const newNotification = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
    };
    setNotifications((prev) => [...prev, newNotification]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Use the custom controller hook for logic
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    runFlow,
    resetFlow,
    handleAutoLayout,
    handleToggleModule,
    handleSelectModule,
    clearSelection,
    selectedNodeId,
    isRunning,
    inputValue,
    setInputValue,
    inputImage,
    setInputImage,
    handleOrchestratePlan,
    isPlanning
  } = useFlowController({ onNotify: addNotification });
  
  // Need to ensure useReactFlow is initialized by wrapping component
  const { fitView } = useReactFlow();

  // Find selected node object
  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  return (
    <div className="flex h-screen w-screen bg-[#09090b] text-white flex-col overflow-hidden">
      <FlowHeader 
        nodes={nodes}
        selectedNodeId={selectedNodeId}
        isRunning={isRunning}
        onRun={runFlow}
        onReset={resetFlow}
        onAutoLayout={handleAutoLayout}
        onToggle={handleToggleModule}
        onSelect={handleSelectModule}
      />

      <div className="flex-1 h-full w-full relative bg-[#27272a] flex" ref={reactFlowWrapper}>
        <div className={`flex-1 h-full transition-all duration-300 ${selectedNodeId ? 'mr-[400px]' : ''}`}>
            <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            minZoom={0.2}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            onPaneClick={clearSelection}
            >
            <Background color="#52525b" gap={24} size={1} />
            <Controls className="bg-[#18181b] border-[#27272a] text-zinc-400" />
            </ReactFlow>

            <CommandBar 
              inputValue={inputValue}
              onInputChange={setInputValue}
              inputImage={inputImage}
              onImageUpload={setInputImage}
              onOrchestrate={handleOrchestratePlan}
              isPlanning={isPlanning}
            />
        </div>

        {/* Inspector Drawer */}
        <InspectorDrawer 
            node={selectedNode} 
            isOpen={!!selectedNodeId} 
            onClose={clearSelection}
        />
        
        {/* Global Notifications */}
        <NotificationToast 
            notifications={notifications} 
            removeNotification={removeNotification} 
        />
      </div>
    </div>
  );
};

const App = () => {
  // -- OAuth Callback Handler --
  useEffect(() => {
    // Check if we are in a popup or if URL params contain OAuth code
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (code && state) {
      // We are the redirect target
      if (window.opener) {
        window.opener.postMessage({ type: 'TWITTER_AUTH_SUCCESS', code, state }, window.location.origin);
        window.close();
      }
    } else if (error) {
      if (window.opener) {
        window.opener.postMessage({ type: 'TWITTER_AUTH_ERROR', error }, window.location.origin);
        window.close();
      }
    }
  }, []);

  // If we are handling an OAuth callback, we can render a simple loader instead of the whole app
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('code') || urlParams.has('error')) {
    return (
      <div className="h-screen w-screen bg-[#09090b] flex items-center justify-center text-white flex-col gap-4">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
        <p className="text-sm font-mono text-zinc-400">Authenticating with X...</p>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  );
};

export default App;