import express from 'express';
import mongoose from 'mongoose'; 
import Post from '../models/Post.js';
import asyncHandler from '../utils/asyncHandler.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const canModify = (user, post) => {
    return user.role === 'admin' || post.author.toString() === String(user.id);
};

const cleanTags = (tags) => {
    return tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean);
};

// 1. Get all published posts (with pagination & tag filtering)
router.get('/', asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

    const filter = { published: true };
    if (typeof req.query.tag === 'string') {
        filter.tags = req.query.tag.toLowerCase().trim();
    }

    const [items, total] = await Promise.all([
        Post.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('author', 'name'),
        Post.countDocuments(filter),
    ]);

    res.json({
        items,
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
    });
}));

// 2. Get logged-in user's posts
router.get('/mine', protect, asyncHandler(async (req, res) => {
    const items = await Post.find({ author: req.user.id }).sort({ createdAt: -1 });
    res.json({ items });
}));

// 3. Get a single post by ID
router.get('/:id', asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid post ID format' });
    }

    const post = await Post.findOne({ _id: req.params.id, published: true }).populate('author', 'name');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    res.json({ post });
}));

// 4. Create a new post
router.post('/', protect, asyncHandler(async (req, res) => {
    const { title, content, tags, published } = req.body || {};
    
    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
    }

    const post = await Post.create({
        title,
        content,
        tags: Array.isArray(tags) ? cleanTags(tags) : [],
        published: published === undefined ? true : Boolean(published),
        author: req.user.id,
    });
    
    res.status(201).json({ post });
}));

// 5. Update a post (FIXED: Added ID validation)
router.put('/:id', protect, asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid post ID format' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (!canModify(req.user, post)) return res.status(403).json({ error: 'Forbidden' });

    const { title, content, tags, published } = req.body || {};
    
    // Explicit undefined checking protects against empty string/falsy overrides
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (Array.isArray(tags)) post.tags = cleanTags(tags);
    if (published !== undefined) post.published = Boolean(published);

    await post.save();
    res.json({ post });
}));

// 6. Delete a post (FIXED: Added ID validation)
router.delete('/:id', protect, asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid post ID format' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (!canModify(req.user, post)) return res.status(403).json({ error: 'Forbidden' });

    await post.deleteOne();
    res.status(204).end(); // 204 No Content means successful deletion without body
}));

export default router;
