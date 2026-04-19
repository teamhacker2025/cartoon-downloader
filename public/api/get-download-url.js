const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { videoUrl } = req.body;
    
    if (!videoUrl || !videoUrl.includes('cartoonporn.com/videos/')) {
        return res.status(400).json({ error: 'Invalid cartoonporn.com video URL' });
    }
    
    try {
        // Fetch the video page
        const { data } = await axios.get(videoUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': 'https://www.cartoonporn.com/'
            }
        });
        
        const $ = cheerio.load(data);
        let downloadLink = null;
        
        // Strategy 1: Look for direct Download MP4 link
        $('a').each((i, el) => {
            const text = $(el).text();
            const href = $(el).attr('href');
            if (text.includes('Download MP4') && href && href.includes('.mp4')) {
                downloadLink = href;
                return false;
            }
        });
        
        // Strategy 2: Find any .mp4 link that appears in download section
        if (!downloadLink) {
            $('a[href$=".mp4"]').each((i, el) => {
                const href = $(el).attr('href');
                if (href && (href.includes('download') || $(el).text().toLowerCase().includes('download'))) {
                    downloadLink = href;
                    return false;
                }
            });
        }
        
        // Strategy 3: Look for source tags or video sources
        if (!downloadLink) {
            $('source[src$=".mp4"]').each((i, el) => {
                downloadLink = $(el).attr('src');
                return false;
            });
        }
        
        // Strategy 4: Search for any mp4 URL in the entire page (last resort)
        if (!downloadLink) {
            const html = data;
            const mp4Match = html.match(/https?:\/\/[^\s"']+\.mp4/i);
            if (mp4Match) {
                downloadLink = mp4Match[0];
            }
        }
        
        if (!downloadLink) {
            throw new Error('Could not find download link. The site structure may have changed.');
        }
        
        // Convert relative URLs to absolute
        if (downloadLink.startsWith('/')) {
            const urlObj = new URL(videoUrl);
            downloadLink = `${urlObj.protocol}//${urlObj.host}${downloadLink}`;
        }
        
        res.json({ 
            success: true, 
            downloadUrl: downloadLink,
            message: 'Video link extracted successfully!'
        });
        
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ 
            error: 'Failed to extract video URL. ' + error.message 
        });
    }
};
