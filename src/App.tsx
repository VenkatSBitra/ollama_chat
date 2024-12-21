import { Layout, Menu, Input, Button, List, Col, Row, Image } from 'antd';
import { Flex, Typography, theme } from 'antd';
import { useEffect, useState } from 'react';
import { Sender } from '@ant-design/x';
import { CloudUploadOutlined, LinkOutlined } from '@ant-design/icons';
import { Conversations } from '@ant-design/x';
import type { ConversationsProps } from '@ant-design/x';
import { DeleteOutlined, EditOutlined, StopOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons';
import ollama from 'ollama';
import ImageSelector from './components/ImageSelector';
import MarkdownRenderer from './components/MarkdownRenderer';

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

const App: React.FC = () => {
    // Current Message
    const [currMessage, setCurrMessage] = useState<string>('');

    // Conversation State
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversation, setCurrentConversation] = useState<string | null>(null);
    
    // Current Chat State
    const [messages, setMessages] = useState<Message[]>([]);
    const [systemPrompt, setSystemPrompt] = useState<string>('You are a helpful assistant.');
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [selectedImages, setSelectedImages] = useState<(string | number)[]>([]);

    // Input State
    const [open, setOpen] = useState(false);
    const { token } = theme.useToken();

    useEffect(() => {
        async function run() {
            const stream = await ollama.chat({
                model: 'llama3.2-vision',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages,
                ],
                stream: true,
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
        if (sessionStorage.getItem('conversations') !== null) {
            setConversations(JSON.parse(sessionStorage.getItem('conversations') as string));
        }
    }, []);

    const changeConversation = (key: string) => {
        setCurrentConversation(key);
        setMessages(sessionStorage.getItem(key) !== null ? JSON.parse(sessionStorage.getItem(key) as string) : []);
        if (conversations.find((conversation) => conversation.key === key)?.systemPrompt !== undefined) {
            setSystemPrompt(conversations.find((conversation) => conversation.key === key)?.systemPrompt as string);
        } else {
            setSystemPrompt('You are a helpful assistant.');
        }
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

    const editConversation = (key: string) => {
        setConversations(conversations.map((conversation) => {
            if (conversation.key === key) {
                return { key, label: "Edited Chat" };
            }
            return conversation;
        }
        ));
    }

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
            <Sider width='16%' style={{ background: '#fff' }}>
                <Typography style={{ textAlign: 'center' }}> Ollama Chat </Typography>
                <hr />
                <Typography style={{ textAlign: 'center' }}>Chats</Typography>
                <Button onClick={createConversation}>New Chat</Button>
                <Conversations items={conversations} menu={menuConfig} onActiveChange={v => changeConversation(v)} />
            </Sider>
            <Layout style={{ padding: '0 24px 24px' }}>
                <Content
                    style={{
                        padding: 24,
                        margin: 0,
                        minHeight: 280,
                        display: 'flex',
                    }}
                >
                    {currentConversation !== null ? <Col flex="auto" style={{ display: 'flex', flexDirection: 'column' }}>
                        <Row style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                            {messages.length > 0 ? <List
                                dataSource={messages}
                                renderItem={(item) => (
                                    <List.Item style={{ padding: '10px 0', display: 'flex', alignItems: 'center' }}>
                                        <div style={{ marginRight: '10px' }}>
                                            {item.role === 'user' ? (
                                                <UserOutlined style={{ fontSize: '2em' }} />
                                            ) : item.role === 'assistant' ? (
                                                <RobotOutlined style={{ fontSize: '2em' }} />
                                            ) : (
                                                <StopOutlined style={{ fontSize: '2em' }} />
                                            )}
                                        </div>
                                        <div style={{ background: '#f1f1f1', padding: '10px', borderRadius: '5px', maxWidth: '90%' }}>
                                            {/* {item.content} */}
                                            <MarkdownRenderer content={item.content} />
                                        </div>
                                    </List.Item>
                                )}
                                style={{ width: '100%' }}
                            /> : <Typography>Start a conversation</Typography>}
                        </Row>
                        <Row>
                            <Sender
                                header={headerNode}
                                prefix={
                                    <Button
                                        type="text"
                                        icon={<LinkOutlined />}
                                        onClick={() => {
                                            setOpen(!open);
                                        }}
                                    />
                                }
                                placeholder="← Click to open"
                                value={currMessage}
                                onChange={(value) => setCurrMessage(value)}
                                onSubmit={() => {
                                    setCurrMessage('');
                                    handleSendMessage();
                                }}
                                style={{ marginTop: 'auto' }}
                            />
                        </Row>
                    </Col> : <Typography>Select a chat to start</Typography>}
                </Content>
            </Layout>
            <Sider width='16%' style={{ background: '#fff' }}>
                <Typography>Chat Settings</Typography>
                <Input.TextArea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="System prompt"
                    rows={4}
                />
                <Typography>Uploaded Images</Typography>
                <ImageSelector images={uploadedImages.map((image, index) => ({ id: index, url: image }))} selectedImages={selectedImages} setSelectedImages={setSelectedImages} />
            </Sider>
        </Layout>
    );
};

export default App;