import React, { useState } from 'react';
import { Image, Button } from 'antd';
import { CheckOutlined, EyeOutlined } from '@ant-design/icons';

interface ImageData {
    id: string | number;
    url: string;
}

interface ImageSelectorProps {
    images: ImageData[];
    selectedImages: (string | number)[];
    setSelectedImages: React.Dispatch<React.SetStateAction<(string | number)[]>>;
}

const ImageSelector: React.FC<ImageSelectorProps> = ({ images, selectedImages, setSelectedImages }) => {

    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewImage, setPreviewImage] = useState('');

    const toggleSelection = (imageId: string | number) => {
        setSelectedImages(prev =>
            prev.includes(imageId)
                ? prev.filter(id => id !== imageId)
                : [...prev, imageId]
        );
    };

    const handlePreview = (imageUrl: string) => {
        setPreviewImage(imageUrl);
        setPreviewVisible(true);
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {images.map((image) => (
                <div
                    key={image.id}
                    style={{ position: 'relative', cursor: 'pointer' }}
                >
                    <div onClick={() => toggleSelection(image.id)}>
                        <Image
                            src={image.url}
                            width={200}
                            preview={false}
                            alt={`Image ${image.id}`}
                        />
                        {selectedImages.includes(image.id) && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                                <CheckOutlined style={{ fontSize: '32px', color: '#fff' }} />
                            </div>
                        )}
                    </div>
                    <Button
                        icon={<EyeOutlined />}
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(image.url);
                        }}
                        style={{
                            position: 'absolute',
                            top: 5,
                            right: 5,
                            zIndex: 1,
                        }}
                    />
                </div>
            ))}
            <Image
                style={{ display: 'none' }}
                preview={{
                    visible: previewVisible,
                    src: previewImage,
                    onVisibleChange: (visible) => setPreviewVisible(visible),
                }}
            />
        </div>
    );
};

export default ImageSelector;
