import React from 'react';

export default function FixedBook() {
  return (
    <div style={styles.bookContainer}>
      <div style={styles.leftCover}></div>
      <div style={styles.spine}></div>
      <div style={styles.rightCover}>
        <div style={styles.pagesStack}></div>
      </div>
    </div>
  );
}

const styles = {
  bookContainer: {
    position: 'absolute',
    top: '12%',
    left: '50%',
    transform: 'translateX(-50%) perspective(1200px) rotateX(15deg)',
    display: 'flex',
    justifyContent: 'center',
    width: '1000px',
    height: '650px',
    zIndex: -1,
    pointerEvents: 'none'
  },
  leftCover: {
    width: '490px',
    height: '630px',
    background: 'linear-gradient(to right, #2a2a2a, #1a1a1a)',
    borderRadius: '8px 0 0 8px',
    boxShadow: '-10px 15px 30px rgba(0,0,0,0.5)'
  },
  spine: {
    width: '40px',
    height: '630px',
    background: 'linear-gradient(to right, #1a1a1a, #0a0a0a, #1a1a1a)',
    borderRadius: '4px'
  },
  rightCover: {
    width: '490px',
    height: '630px',
    background: 'linear-gradient(to left, #2a2a2a, #1a1a1a)',
    borderRadius: '0 8px 8px 0',
    position: 'relative',
    boxShadow: '10px 15px 30px rgba(0,0,0,0.5)'
  },
  pagesStack: {
    position: 'absolute',
    top: '4px',
    bottom: '4px',
    left: '0',
    right: '4px',
    background: '#e0dfd5',
    borderRadius: '0 6px 6px 0',
    boxShadow: 'inset -5px 0 10px rgba(0,0,0,0.05)'
  }
};
