import React from 'react';

import MarkdownRenderer from './MarkdownRenderer';

import { Button, Row, Col } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

// I want a component that can render multiple Markdown units from MarkdownRenderer
// It should have a right arrow button to navigate to the next unit and a left arrow button to navigate to the previous unit
// It should take a list of Markdown units as a prop
// It should render the last unit by default
// Use Ant Design's Button component for the arrow buttons
// Use Ant Design's Row and Col components to layout the buttons and the MarkdownRenderer
// Use Ant Design's Typography component to display the Markdown content
// Use Ant Design's Icons for the arrow buttons

// It should not cycle back to the first unit when clicking the right arrow button on the last unit

interface MultipleMarkdownRendererProps {
  markdownUnits: string[]; // The LLM output containing multiple Markdown units
}

const MultipleMarkdownRenderer: React.FC<MultipleMarkdownRendererProps> = ({ markdownUnits }) => {
  const [currentUnitIndex, setCurrentUnitIndex] = React.useState(markdownUnits.length - 1);

  const handleNextUnit = () => {
    setCurrentUnitIndex((prevIndex) => (prevIndex + 1) % markdownUnits.length);
  };

  const handlePreviousUnit = () => {
    setCurrentUnitIndex((prevIndex) => (prevIndex - 1 + markdownUnits.length) % markdownUnits.length);
  };

  return (
    <div>
      <Row justify="space-between">
        <Col>
          <Button type="primary" shape="circle" icon={<LeftOutlined />} onClick={handlePreviousUnit} disabled={currentUnitIndex === 0} />
        </Col>
        <Col>
          <Button type="primary" shape="circle" icon={<RightOutlined />} onClick={handleNextUnit} disabled={currentUnitIndex === markdownUnits.length - 1} />
        </Col>
      </Row>
      <MarkdownRenderer content={markdownUnits[currentUnitIndex]} />
    </div>
  );
};

export default MultipleMarkdownRenderer;