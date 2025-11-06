import logo from './Fanevent-Logo.svg'
import googlePlay from './googlePlay.svg'
import appStore from './appStore.svg'
import profile from './profile.png'

export const assets = {
    logo,
    googlePlay,
    appStore,
    profile
}

export const dummyEventsData = [
    {
        "_id": "evt001",
        "title": "19th Century Art",
        "category": "Art Museum Enthusiasts",
        "overview": "Explore the masterpieces of 19th century European art in an intimate gallery setting.",
        "description": "Impressionism is a 19th-century art movement characterized by relatively small, thin, yet visible brush strokes, open composition, emphasis on accurate depiction of light in its changing qualities (often emphasizing the effects of the passage of time), ordinary subject matter, unusual visual angles, and inclusion of movement as a crucial element of human perception and experience. Join us for an immersive journey through the works of Monet, Renoir, Degas, and other masters who revolutionized the art world. This exhibition features over 50 paintings on loan from prestigious museums around the world, including rarely seen private collections. Expert docents will be available for guided tours throughout the day.",
        "image": "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800",
        "date": "2025-11-15",
        "time": "10:00 AM - 6:00 PM PST",
        "location": "San Francisco, CA",
        "address": "50 Hagiwara Tea Garden Dr",
        "attendees": 67,
        "tags": ["Impressionism", "Art History", "Museum"],
        "media": [
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800",
                "title": "Main exhibition hall",
                "by": "Event Organizer"
            },
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1568392388350-a33157b67a8b?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1170",
                "title": "Featured impressionist works",
                "by": "Gallery Curator"
            },
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=800",
                "title": "Gallery interior",
                "by": "Venue Staff"
            },
            {
                "type": "video",
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "title": "Exhibition preview",
                "by": "Marketing Team"
            }
        ]
    },
    {
        "_id": "evt002",
        "title": "K-Pop Dance Workshop",
        "category": "K-Pop Fans United",
        "overview": "Learn choreography from the latest K-Pop hits with professional instructors.",
        "description": "Get ready to move! This intensive K-Pop dance workshop will teach you the hottest choreography from your favorite groups including BTS, BLACKPINK, Stray Kids, and NewJeans. Our professional instructors have years of experience and have worked with major K-Pop entertainment companies. The workshop is designed for all skill levels - whether you're a complete beginner or an experienced dancer looking to refine your technique. We'll break down complex moves step-by-step, focusing on signature K-Pop elements like sharp isolations, powerful formations, and synchronized group work. Participants will learn two complete routines throughout the day. Wear comfortable clothing and bring plenty of water!",
        "image": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800",
        "date": "2025-11-16",
        "time": "2:00 PM - 6:00 PM PST",
        "location": "Los Angeles, CA",
        "address": "1234 Dance Studio Blvd",
        "attendees": 45,
        "tags": ["K-Pop", "Dance", "Workshop"],
        "media": [
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800",
                "title": "Dance studio setup",
                "by": "Event Organizer"
            },
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1547153760-18fc86324498?w=800",
                "title": "Previous workshop",
                "by": "Studio Manager"
            },
            {
                "type": "video",
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "title": "Workshop highlights",
                "by": "Media Team"
            }
        ]
    },
    {
        "_id": "evt003",
        "title": "Marvel Movie Marathon",
        "category": "Marvel Universe Fans",
        "overview": "Join us for an epic marathon of Marvel's greatest films on the big screen.",
        "description": "Calling all Marvel fans! Experience the Marvel Cinematic Universe like never before with our special movie marathon event. We'll be screening six iconic films back-to-back on the big screen: Iron Man, The Avengers, Guardians of the Galaxy, Black Panther, Avengers: Infinity War, and Avengers: Endgame. The theater will be decked out with Marvel decorations, and we encourage attendees to come in costume! There will be trivia contests between films with amazing prizes, including exclusive Marvel merchandise and collectibles. Food and drinks will be available throughout the event, with themed menu items inspired by your favorite characters. This is a once-in-a-lifetime opportunity to experience these beloved films with fellow superfans in a theatrical setting.",
        "image": "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=800",
        "date": "2025-11-22",
        "time": "9:00 AM - 11:00 PM EST",
        "location": "New York, NY",
        "address": "789 Cinema Drive",
        "attendees": 120,
        "tags": ["Marvel", "Movies", "Cosplay"],
        "media": [
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=800",
                "title": "Theater lobby setup",
                "by": "Event Coordinator"
            },
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800",
                "title": "Previous marathon event",
                "by": "Marketing Team"
            },
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1611604548018-d56bbd85d681?w=800",
                "title": "Cosplay contest",
                "by": "Photo Team"
            }
        ]
    },
    {
        "_id": "evt004",
        "title": "Renaissance Fair",
        "category": "History Enthusiasts",
        "overview": "Step back in time to the Renaissance era with authentic costumes, food, and entertainment.",
        "description": "Hear ye, hear ye! Join us for a magnificent Renaissance Fair celebrating the culture, art, and spirit of the 16th century. Our faire features over 100 artisan vendors selling handcrafted goods, authentic period clothing, jewelry, and weaponry. Watch thrilling jousting tournaments, marvel at skilled falconry demonstrations, and enjoy performances by wandering minstrels and jesters. Feast on traditional fare including turkey legs, mead, and fresh-baked bread at our authentic taverns. Participate in interactive activities like axe throwing, archery, and period dance lessons. Children will love the petting zoo, puppet shows, and the chance to be knighted by the King! Full period costume is encouraged but not required. This family-friendly event is a feast for all the senses!",
        "image": "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800",
        "date": "2025-11-18",
        "time": "10:00 AM - 8:00 PM PST",
        "location": "Portland, OR",
        "address": "456 Fairground Lane",
        "attendees": 89,
        "tags": ["History", "Costume", "Fair"],
        "media": [
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800",
                "title": "Fair entrance",
                "by": "Event Organizer"
            },
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
                "title": "Jousting tournament",
                "by": "Fair Marshal"
            },
            {
                "type": "video",
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "title": "Faire highlights 2024",
                "by": "Media Guild"
            }
        ]
    },
    {
        "_id": "evt005",
        "title": "Anime Convention 2024",
        "category": "Anime & Manga Fans",
        "overview": "The biggest anime convention of the year featuring special guests, panels, and cosplay contests.",
        "description": "Welcome to the ultimate celebration of Japanese animation and manga! Our annual anime convention brings together thousands of fans for three days of non-stop entertainment. This year's guest lineup includes renowned voice actors, manga artists, and industry professionals who will participate in panels, autograph sessions, and meet-and-greets. The artist alley features over 200 creators selling original artwork, prints, and merchandise. Our main events include the prestigious cosplay masquerade with prizes totaling $10,000, 24-hour gaming room, anime screening rooms showing classic and new releases, and the massive vendor hall with exclusive convention merchandise. Educational panels cover topics from drawing manga to the history of anime. Evening concerts feature J-Rock and anime theme song performances. This is the can't-miss event for any anime enthusiast!",
        "image": "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=800",
        "date": "2025-12-05",
        "time": "9:00 AM - 10:00 PM PST",
        "location": "Seattle, WA",
        "address": "800 Convention Place",
        "attendees": 234,
        "tags": ["Anime", "Cosplay", "Convention"],
        "media": [
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=800",
                "title": "Convention center entrance",
                "by": "Event Staff"
            },
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=800",
                "title": "Artist alley preview",
                "by": "Marketing Team"
            },
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800",
                "title": "Cosplay showcase",
                "by": "Photo Team"
            },
            {
                "type": "video",
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "title": "2023 Convention recap",
                "by": "Video Production"
            }
        ]
    },
    {
        "_id": "evt006",
        "title": "Indie Music Festival",
        "category": "Indie Music Lovers",
        "overview": "Discover emerging indie artists in an intimate outdoor venue.",
        "description": "Experience the best of independent music at our curated outdoor festival featuring 20 up-and-coming bands and solo artists across three stages. From indie rock to folk, electronic to alternative, our diverse lineup showcases the most exciting new voices in music. The festival takes place in a beautiful park setting with food trucks offering gourmet options, craft beer gardens, and artisan market stalls. VIP packages include front-stage access and meet-and-greet opportunities with the artists. We're committed to sustainability - this is a zero-waste event with recycling stations and compostable serviceware. Bring blankets and lawn chairs for a relaxed afternoon of incredible live music. Past attendees have discovered their new favorite bands at this festival. Don't miss your chance to say 'I saw them before they were famous!'",
        "image": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800",
        "date": "2025-11-28",
        "time": "12:00 PM - 11:00 PM CST",
        "location": "Austin, TX",
        "address": "1500 Festival Park Road",
        "attendees": 156,
        "tags": ["Music", "Festival", "Indie"],
        "media": [
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800",
                "title": "Main stage at sunset",
                "by": "Event Photographer"
            },
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800",
                "title": "Festival grounds",
                "by": "Venue Manager"
            },
            {
                "type": "video",
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "title": "Festival aftermovie 2024",
                "by": "Media Team"
            }
        ]
    },
    {
        "_id": "evt007",
        "title": "Comic Book Swap Meet",
        "category": "Comic Collectors",
        "overview": "Trade and sell vintage and modern comics with fellow collectors.",
        "description": "Attention comic collectors and enthusiasts! Our quarterly comic swap meet is the premier destination for buying, selling, and trading comic books in the region. With over 50 vendor tables, you'll find everything from Golden Age classics to the latest releases. Expert appraisers will be on hand to evaluate your collection for free. Special attractions include a CGC grading representative, exclusive variant covers available only at the event, and guest appearances by local comic artists doing sketch commissions. Educational panels throughout the day cover topics like comic preservation, investment strategies, and the history of comics. Whether you're looking to complete your collection, discover new series, or connect with fellow fans, this is the event for you. Serious collectors and casual readers alike will find treasures. Free admission with early bird VIP access available.",
        "image": "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=800",
        "date": "2025-11-25",
        "time": "9:00 AM - 5:00 PM CST",
        "location": "Chicago, IL",
        "address": "2100 Comic Center Drive",
        "attendees": 78,
        "tags": ["Comics", "Collecting", "Trading"],
        "media": [
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=800",
                "title": "Vendor tables",
                "by": "Event Organizer"
            },
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1601645191163-3fc0d5d64e35?w=800",
                "title": "Rare comic showcase",
                "by": "Head Appraiser"
            }
        ]
    },
    {
        "_id": "evt008",
        "title": "Retro Gaming Tournament",
        "category": "Classic Gamers",
        "overview": "Compete in classic arcade and console games from the 80s and 90s.",
        "description": "Level up your weekend at our Retro Gaming Tournament! Compete for glory and prizes in classic games including Street Fighter II, Super Mario Bros. 3, Pac-Man, Donkey Kong, and more. Our venue features over 40 vintage arcade cabinets and classic consoles, all in perfect working condition. Tournament brackets will be organized by skill level, so everyone has a chance to compete. Between matches, enjoy free play on hundreds of classic games, participate in speedrun challenges, and test your knowledge in trivia contests. Special guests include professional speedrunners and gaming historians who will share stories and tips. The prize pool includes vintage gaming equipment, modern retro consoles, and cash prizes. Food and drinks themed after classic games will be available. Whether you're a competitive player or just nostalgic for the golden age of gaming, this tournament is a blast from the past!",
        "image": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800",
        "date": "2025-12-02",
        "time": "11:00 AM - 9:00 PM MST",
        "location": "Denver, CO",
        "address": "3200 Arcade Avenue",
        "attendees": 92,
        "tags": ["Gaming", "Retro", "Tournament"],
        "media": [
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800",
                "title": "Arcade setup",
                "by": "Tournament Director"
            },
            {
                "type": "image",
                "url": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800",
                "title": "Classic consoles on display",
                "by": "Venue Staff"
            },
            {
                "type": "video",
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "title": "Tournament highlights 2024",
                "by": "Gaming Media"
            }
        ]
    }
]

export const dummyGroupsData = [
    {
        "_id": "grp001",
        "name": "Art Museum Enthusiasts",
        "description": "A community of art lovers who enjoy visiting museums and discussing art history.",
        "image": "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800",
        "members": 1245,
        "category": "Arts & Culture"
    },
    {
        "_id": "grp002",
        "name": "K-Pop Fans United",
        "description": "For fans of Korean pop music and culture to connect and share their passion.",
        "image": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
        "members": 3567,
        "category": "Music"
    },
    {
        "_id": "grp003",
        "name": "Marvel Universe Fans",
        "description": "Dedicated to all things Marvel - comics, movies, TV shows, and collectibles.",
        "image": "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800",
        "members": 5821,
        "category": "Entertainment"
    },
    {
        "_id": "grp004",
        "name": "Board Game Enthusiasts",
        "description": "Meet fellow board game lovers for weekly game nights and strategy discussions.",
        "image": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800",
        "members": 892,
        "category": "Gaming"
    },
    {
        "_id": "grp005",
        "name": "Photography Collective",
        "description": "A group for photographers of all skill levels to share work and improve together.",
        "image": "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800",
        "members": 2134,
        "category": "Arts & Culture"
    },
    {
        "_id": "grp006",
        "name": "Sci-Fi Book Club",
        "description": "Monthly discussions of classic and contemporary science fiction literature.",
        "image": "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800",
        "members": 1567,
        "category": "Literature"
    },
    {
        "_id": "grp007",
        "name": "Vintage Car Club",
        "description": "Classic car enthusiasts sharing restoration tips and organizing car shows.",
        "image": "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800",
        "members": 2891,
        "category": "Automotive"
    },
    {
        "_id": "grp008",
        "name": "Urban Explorers",
        "description": "Discover hidden gems and abandoned places in cities around the world.",
        "image": "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800",
        "members": 1723,
        "category": "Adventure"
    }
]