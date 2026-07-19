import React from 'react';
import { Link } from 'react-router-dom';
import './Blog.css';

const Blog = () => {
  return (
    <div className="blog-container">
      <nav className="blog-nav">
        <ul>
          <li><Link to="/posts">Posts</Link></li>
          <li><Link to="/gallery">Gallery</Link></li>
          <li><Link to="/contacts">Contacts</Link></li>
        </ul>
      </nav>
      
      <main className="blog-main">
        {/* This will be replaced by route content */}
      </main>
    </div>
  );
};

export default Blog;