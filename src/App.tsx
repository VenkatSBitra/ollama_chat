import { Layout, Menu, Input, Button, List, Col, Row, Image, Slider, Dropdown, MenuProps, Popconfirm, message, Divider } from 'antd';
import { Flex, Typography, theme } from 'antd';
import { useEffect, useState } from 'react';
import { Sender } from '@ant-design/x';
import { CloudUploadOutlined, LinkOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { Conversations } from '@ant-design/x';
import type { ConversationsProps } from '@ant-design/x';
import { DeleteOutlined, EditOutlined, StopOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons';
import ollama from 'ollama';
import ImageSelector from './components/ImageSelector';
import MarkdownRenderer from './components/MarkdownRenderer';
import TextArea from 'antd/es/input/TextArea';

const { Header, Sider, Content } = Layout;

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
    images?: string[];
}

interface Conversation {
    key: string;
    label: string;
    systemPrompt?: string;
    temperature?: number;
    model?: string;
}

interface Config {
    name: string;
    systemPrompt: string;
    temperature: number;
    model: string;
}

const App: React.FC = () => {
    // Message API
    const [messageApi, contextHolder] = message.useMessage();

    // Current Message
    const [currMessage, setCurrMessage] = useState<string>('');

    // Conversation State
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversation, setCurrentConversation] = useState<string | null>(null);

    // Configurations
    const [configs, setConfigs] = useState<Config[]>([{
        name: 'Default',
        systemPrompt: 'You are a helpful assistant.',
        temperature: 0.5,
        model: 'llama3.2-vision:latest',
    }]);
    const [configsMenu, setConfigsMenu] = useState<MenuProps['items']>([]);
    const [currConfig, setCurrConfig] = useState<Config | null>(null);
    const [currConfigName, setCurrConfigName] = useState<string>('Default');

    // Ollama Configuration
    const [models, setModels] = useState<string[]>([]);
    const [modelMenu, setModelMenu] = useState<MenuProps['items'] | null>(null);
    const [currModel, setCurrModel] = useState<string | null>(null);
    
    // Current Chat State
    const [messages, setMessages] = useState<Message[]>([]);
    const [systemPrompt, setSystemPrompt] = useState<string>('You are a helpful assistant.');
    const [temperature, setTemperature] = useState<number>(0.5);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [selectedImages, setSelectedImages] = useState<(string | number)[]>([]);

    // Input State
    const [open, setOpen] = useState(false);
    const { token } = theme.useToken();

    useEffect(() => {
        async function run() {
            const stream = await ollama.chat({
                model: currModel as string,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages,
                ],
                stream: true,
                options: {
                    temperature: temperature,
                },
            });

            let response_final = '';
            for await (const response of stream) {
                response_final += response.message.content;
                setMessages((prevMessages) => [
                    ...prevMessages.slice(0, -1),
                    { role: 'assistant', content: response_final },
                ]);
            }
        }
        if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
            setMessages((prevMessages) => [
                ...prevMessages,
                { role: 'assistant', content: '' },
            ]);
            run();
        }
        updateConversation(currentConversation as string);
    }, [messages]);

    useEffect(() => {
        sessionStorage.clear();

        // Load Conversations
        if (sessionStorage.getItem('conversations') !== null) {
            setConversations(JSON.parse(sessionStorage.getItem('conversations') as string));
        }

        // Load Models
        let m = null;
        ollama.list().then((models) => {
            return models.models.sort(e => -e.size).map(e => e.name)
        }).then((models) => {
            m = models;
            setModels(models);
            setCurrModel(models[0]);
            setModelMenu(models.map(e => (
                { 
                    key: e, 
                    label: <div>{e}</div>,
                }
            )));
        });

        // Load Configurations
        if (sessionStorage.getItem('configs') !== null) {
            setConfigs(JSON.parse(sessionStorage.getItem('configs') as string));
        } else {
            setConfigs([
                {
                    name: 'Default',
                    systemPrompt: 'You are a helpful assistant.',
                    temperature: 0.5,
                    model: m ? m[0] : 'llama3.2-vision:latest',
                }
            ]);
            sessionStorage.setItem('configs', JSON.stringify([
                {
                    name: 'Default',
                    systemPrompt: 'You are a helpful assistant.',
                    temperature: 0.5,
                    model: m ? m[0] : 'llama3.2-vision:latest',
                }
            ]));
        }

        const configs: Config[] = JSON.parse(sessionStorage.getItem('configs') as string);
        setConfigsMenu(configs.map(e => (
            { 
                key: e.name, 
                label: <div>{e.name}</div>,
            }
        )));
    }, []);

    const changeConversation = (key: string) => {
        setCurrentConversation(key);
        setMessages(sessionStorage.getItem(key) !== null ? JSON.parse(sessionStorage.getItem(key) as string) : []);
        setSystemPrompt(sessionStorage.getItem(key + '-sysprompt') !== null ? sessionStorage.getItem(key + '-sysprompt') as string : 'You are a helpful assistant.');
        setTemperature(sessionStorage.getItem(key + '-temp') !== null ? parseFloat(sessionStorage.getItem(key + '-temp') as string) : 0.5);
        setCurrModel(sessionStorage.getItem(key + '-model') !== null ? sessionStorage.getItem(key + '-model') as string : models[0]);
    }

    const updateConversation = (key: string) => {
        sessionStorage.setItem(key, JSON.stringify(messages));
    }

    const menuConfig: ConversationsProps['menu'] = (conversation) => ({
        items: [
            {
                label: 'Edit',
                key: 'edit',
                icon: <EditOutlined />,
            },
            {
                label: 'Delete',
                key: 'delete',
                icon: <DeleteOutlined />,
                danger: true,
            },
        ],
        onClick: (menuInfo) => {
            if (menuInfo.key === 'delete') {
                deleteConversation(conversation.key);
            }
            if (menuInfo.key === 'edit') {
                console.log('Edit');
            }
        },
    });

    const createConversation = () => {
        const key = `conversation-${conversations.length}-${Date.now()}`;
        setConversations([...conversations, { key, label: "New Chat" }]);
        sessionStorage.setItem('conversations', JSON.stringify([...conversations, { key, label: "New Chat" }]));
    }

    const deleteConversation = (key: string) => {
        setConversations(conversations.filter((conversation) => conversation.key !== key));
        sessionStorage.setItem('conversations', JSON.stringify(conversations.filter((conversation) => conversation.key !== key)));
    }

    // const editConversation = (key: string) => {
    //     setConversations(conversations.map((conversation) => {
    //         if (conversation.key === key) {
    //             return { key, label: "Edited Chat" };
    //         }
    //         return conversation;
    //     }
    //     ));
    // }

    const handleSendMessage = () => {
        setMessages([...messages, { role: 'user', content: currMessage, images: uploadedImages.filter((_, index) => selectedImages.includes(index)).map(e => e.split(',')[1]) }]);
        setCurrMessage('');
    };

    const handleFileUpload = (file: File) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
            const base64data = reader.result as string;
            setUploadedImages((prevImages) => [...prevImages, base64data]);
        };
        reader.onerror = (error) => {
            console.error('Error processing file:', error);
        };
    };

    const configOnSelect = ({ key }: { key: string }) => {
        const config = configs.find(e => e.name === key);
        setCurrConfig(config ? config : null);
        setCurrModel(config?.model || models[0]);
        setSystemPrompt(config?.systemPrompt || 'You are a helpful assistant.');
        setTemperature(config?.temperature || 0.5);
    }

    const configConfirm = () => {
        const name = currConfigName;
        if (configs.find(e => e.name === name)) {
            messageApi.error('Configuration name already exists');
            return;
        }
        setConfigs([...configs, {
            name: name as string,
            systemPrompt: systemPrompt,
            temperature: temperature,
            model: currModel as string,
        }]);
        sessionStorage.setItem('configs', JSON.stringify([...configs, {
            name: name as string,
            systemPrompt: systemPrompt,
            temperature: temperature,
            model: currModel as string,
        }]));
        if (configsMenu !== undefined)
            setConfigsMenu([...configsMenu, {
                key: name as string,
                label: <div>{name}</div>,
            }]);
        else
            setConfigsMenu([{
                key: name as string,
                label: <div>{name}</div>,
            }]);
        messageApi.success(`Configuration ${name} added.`);
    }

    const configDelete = () => {
        const name = currConfig?.name;
        if (name === undefined) {
            messageApi.error('No configuration selected');
            return;
        }
        if (name === 'Default') {
            messageApi.error('Cannot delete default configuration');
            return;
        }
        setConfigs(configs.filter(e => e.name !== name));
        sessionStorage.setItem('configs', JSON.stringify(configs.filter(e => e.name !== name)));
        setConfigsMenu(configsMenu?.filter(e => e?.key !== name));
        setCurrConfig(null);
        messageApi.success(`Configuration ${name} deleted.`);
    }

    const headerNode = (
        <Sender.Header title="Upload Sample" open={open} onOpenChange={setOpen}>
            <Flex vertical align="center" gap="small" style={{ marginBlock: token.paddingLG }}>
                <CloudUploadOutlined style={{ fontSize: '4em' }} />
                <Typography.Title level={5} style={{ margin: 0 }}>
                    Drag file here or click to upload
                </Typography.Title>
                <Typography.Text type="secondary">
                    Support pdf, doc, xlsx, ppt, txt, image file types
                </Typography.Text>
                <input
                    type="file"
                    style={{ display: 'none' }}
                    id="file-upload"
                    onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                            handleFileUpload(e.target.files[0]);
                        }
                    }}
                />
                <Button
                    onClick={() => {
                        document.getElementById('file-upload')?.click();
                    }}
                >
                    Select File
                </Button>
            </Flex>
        </Sender.Header>
    );

    return (
        <Layout style={{ height: '100vh' }}>
            {contextHolder}
            {/* <Sider width='16%' style={{ background: '#fff' }}>
                <Typography style={{ textAlign: 'center' }}> Ollama Chat </Typography>
                <hr />
                <Typography style={{ textAlign: 'center' }}>Chats</Typography>
                <Button onClick={createConversation}>New Chat</Button>
                <Conversations items={conversations} menu={menuConfig} onActiveChange={v => changeConversation(v)} />
            </Sider> */}
            <Sider 
                width="16%" 
                style={{ 
                    background: '#f5f5f5', 
                    padding: '16px', 
                    boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)' 
                }}
            >
                {/* Header */}
                <Typography.Title 
                    level={4} 
                    style={{ 
                        textAlign: 'center', 
                        marginBottom: '16px', 
                        color: '#333' 
                    }}
                >
                    Ollama Chat
                </Typography.Title>

                <Divider style={{ margin: '8px 0' }} />

                {/* Chats Section */}
                <Typography.Text 
                    strong 
                    style={{ 
                        display: 'block', 
                        textAlign: 'center', 
                        marginBottom: '12px', 
                        fontSize: '16px', 
                        color: '#555' 
                    }}
                >
                    Chats
                </Typography.Text>

                <Button 
                    type="primary" 
                    block 
                    style={{ marginBottom: '16px' }} 
                    onClick={createConversation}
                >
                    New Chat
                </Button>

                {/* Conversations List */}
                <Conversations 
                    items={conversations} 
                    menu={menuConfig} 
                    onActiveChange={(v) => changeConversation(v)} 
                    style={{ padding: '0 8px' }}
                />
            </Sider>
            <Layout style={{ padding: '0 24px 24px' }}>
                <Content
                    style={{
                        padding: '24px',
                        margin: 0,
                        minHeight: 280,
                        display: 'flex',
                        background: '#fff', // Ensures content area is distinct from the background
                    }}
                >
                    {currentConversation !== null ? (
                        <Col
                            flex="auto"
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                            }}
                        >
                            {/* Message List Section */}
                            <Row
                                style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    padding: '20px',
                                    backgroundColor: '#f9f9f9',
                                    borderRadius: '8px',
                                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
                                }}
                            >
                                {messages.length > 0 ? (
                                    <List
                                        dataSource={messages}
                                        renderItem={(item) => (
                                            <List.Item
                                                style={{
                                                    padding: '10px 0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                {/* Avatar */}
                                                <div style={{ marginRight: '10px' }}>
                                                    {item.role === 'user' ? (
                                                        <UserOutlined style={{ fontSize: '2em', color: '#1890ff' }} />
                                                    ) : item.role === 'assistant' ? (
                                                        <RobotOutlined style={{ fontSize: '2em', color: '#52c41a' }} />
                                                    ) : (
                                                        <StopOutlined style={{ fontSize: '2em', color: '#f5222d' }} />
                                                    )}
                                                </div>

                                                {/* Message Content */}
                                                <div
                                                    style={{
                                                        background: '#f1f1f1',
                                                        padding: '10px',
                                                        borderRadius: '5px',
                                                        maxWidth: '90%',
                                                        wordBreak: 'break-word',
                                                    }}
                                                >
                                                    <MarkdownRenderer content={item.content} />
                                                </div>
                                            </List.Item>
                                        )}
                                        style={{ width: '100%' }}
                                    />
                                ) : (
                                    <Typography.Text type="secondary">
                                        Start a conversation
                                    </Typography.Text>
                                )}
                            </Row>

                            {/* Message Input Section */}
                            <Row style={{ marginTop: '16px' }}>
                                <Sender
                                    header={headerNode}
                                    prefix={
                                        <Button
                                            type="text"
                                            icon={<LinkOutlined />}
                                            onClick={() => setOpen(!open)}
                                        />
                                    }
                                    placeholder="← Click to open"
                                    value={currMessage}
                                    onChange={(value) => setCurrMessage(value)}
                                    onSubmit={() => {
                                        setCurrMessage('');
                                        handleSendMessage();
                                    }}
                                    style={{
                                        marginTop: 'auto',
                                        width: '100%',
                                        background: '#fff',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
                                    }}
                                />
                            </Row>
                        </Col>
                    ) : (
                        <Typography.Text type="secondary" style={{ margin: 'auto' }}>
                            Select a chat to start
                        </Typography.Text>
                    )}
                </Content>
            </Layout>
            {currentConversation !== null && 
                <Sider
                    width="16%"
                    style={{
                        background: '#f5f5f5',
                        padding: '16px',
                        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
                    }}
                >
                    {/* Section: Chat Settings */}
                    <Typography.Title level={5} style={{ marginBottom: '16px', textAlign: 'center' }}>
                        Chat Settings
                    </Typography.Title>

                    {/* Section: Configurations */}
                    <Typography.Text strong style={{ display: 'block', marginBottom: '8px' }}>
                        Configurations
                    </Typography.Text>
                    <Row gutter={8} style={{ marginBottom: '16px' }}>
                        <Col span={16}>
                            <Dropdown
                                menu={{
                                    items: configsMenu as MenuProps['items'],
                                    selectable: true,
                                    onSelect: configOnSelect,
                                }}
                            >
                                <Button style={{ width: '100%' }}>
                                    {currConfig ? currConfig.name : 'Select Config'}
                                </Button>
                            </Dropdown>
                        </Col>
                        <Col span={4}>
                            <Popconfirm
                                title={
                                    <div>
                                        <Typography.Text>Enter configuration name</Typography.Text>
                                        <Input
                                            placeholder="Enter configuration name"
                                            value={currConfigName}
                                            onChange={(e) => setCurrConfigName(e.target.value)}
                                            style={{ marginTop: '8px' }}
                                        />
                                    </div>
                                }
                                onConfirm={configConfirm}
                                okText="Add"
                                cancelText="Cancel"
                            >
                                <Button icon={<PlusSquareOutlined />} />
                            </Popconfirm>
                        </Col>
                        <Col span={4}>
                            <Popconfirm
                                title="Are you sure you want to delete this configuration?"
                                onConfirm={configDelete}
                                okText="Delete"
                                cancelText="Cancel"
                            >
                                <Button icon={<DeleteOutlined />} />
                            </Popconfirm>
                        </Col>
                    </Row>

                    {/* Section: Model */}
                    <Typography.Text strong style={{ display: 'block', marginBottom: '8px' }}>
                        Model
                    </Typography.Text>
                    <Dropdown
                        menu={{
                            items: modelMenu as MenuProps['items'],
                            selectable: true,
                            selectedKeys: [currModel as string],
                            onSelect: ({ key }) => {
                                setCurrModel(key);
                                sessionStorage.setItem(currentConversation + '-model', key);
                            },
                        }}
                    >
                        <Button style={{ width: '100%', marginBottom: '16px' }}>{currModel}</Button>
                    </Dropdown>

                    {/* Section: System Prompt */}
                    <Typography.Text strong style={{ display: 'block', marginBottom: '8px' }}>
                        System Prompt
                    </Typography.Text>
                    <TextArea
                        value={systemPrompt}
                        onChange={(e) => {
                            setSystemPrompt(e.target.value);
                            sessionStorage.setItem(currentConversation + '-sysprompt', e.target.value);
                        }}
                        placeholder="System prompt"
                        rows={4}
                        style={{ marginBottom: '16px' }}
                    />

                    {/* Section: Temperature */}
                    <Typography.Text strong style={{ display: 'block', marginBottom: '8px' }}>
                        Temperature
                    </Typography.Text>
                    <Slider
                        min={0}
                        max={1}
                        step={0.01}
                        value={temperature}
                        onChange={(value) => {
                            setTemperature(value);
                            sessionStorage.setItem(currentConversation + '-temp', value.toString());
                        }}
                        style={{ marginBottom: '16px' }}
                    />

                    {/* Section: Uploaded Images */}
                    <Typography.Text strong style={{ display: 'block', marginBottom: '8px' }}>
                        Uploaded Images
                    </Typography.Text>
                    <ImageSelector
                        images={uploadedImages.map((image, index) => ({ id: index, url: image }))}
                        selectedImages={selectedImages}
                        setSelectedImages={setSelectedImages}
                    />
                </Sider>
            }
        </Layout>
    );
};

export default App;