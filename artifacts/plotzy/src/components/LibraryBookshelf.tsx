import { cn } from "@/lib/utils";
import "./LibraryBookshelf.css";

export type ShelfBookData = {
    title: string;
    author: string;
    color: string;
    spineText: string;
    decorType: 'none' | 'simple' | 'heavy' | 'lines';
    isPaper?: boolean;
};

interface LibraryBookshelfProps {
    onBookClick?: (book: ShelfBookData) => void;
}

export function LibraryBookshelf({ onBookClick }: LibraryBookshelfProps) {
    const handleBookClick = (book: ShelfBookData) => {
        if (onBookClick) onBookClick(book);
    };

    return (
        <div className="library-container">
            <div className="bookshelf">
                <div className="book white has-simple-text" onClick={() => handleBookClick({ title: "Chronicles", author: "A. Writer", color: "#e8e6df", spineText: "I", decorType: 'none' })}><div className="spine"></div></div>
                <div className="book white has-simple-text" onClick={() => handleBookClick({ title: "Chronicles II", author: "A. Writer", color: "#e8e6df", spineText: "II", decorType: 'none' })}><div className="spine"></div></div>
                <div className="book maroon decor-heavy" onClick={() => handleBookClick({ title: "The King's Fall", author: "J. Doe", color: "#4a1c20", spineText: "", decorType: 'heavy' })}><div className="spine"></div></div>
                <div className="book crimson has-lines" onClick={() => handleBookClick({ title: "Blood Magic", author: "S. Smith", color: "#63211c", spineText: "", decorType: 'lines' })}><div className="spine"></div></div>
                <div className="book orange-red decor-simple" onClick={() => handleBookClick({ title: "Autumn Leaves", author: "L. Green", color: "#a13220", spineText: "", decorType: 'simple' })}><div className="spine"></div></div>
                <div className="book orange-red has-lines" onClick={() => handleBookClick({ title: "Fire", author: "M. Blaze", color: "#a13220", spineText: "", decorType: 'lines' })}><div className="spine"></div></div>
                <div className="book navy decor-heavy" onClick={() => handleBookClick({ title: "Ocean Depths", author: "C. Diver", color: "#182536", spineText: "", decorType: 'heavy' })}><div className="spine"></div></div>

                <div className="book book-pages" onClick={() => handleBookClick({ title: "Old Manuscript", author: "Unknown", color: "#d1c1a3", spineText: "", decorType: 'none', isPaper: true })}>
                    <div className="paper-lines"></div>
                </div>

                <div className="book yellow thin" onClick={() => handleBookClick({ title: "Poems", author: "T. Poet", color: "#cda22d", spineText: "", decorType: 'none' })}><div className="spine"></div></div>

                <div className="book orange" onClick={() => handleBookClick({ title: "Plotzy: Start", author: "System", color: "#b8621b", spineText: "P", decorType: 'none' })}><div className="spine"><span className="letter">P</span></div></div>
                <div className="book purple" onClick={() => handleBookClick({ title: "Plotzy: Lore", author: "System", color: "#422949", spineText: "L", decorType: 'none' })}><div className="spine"><span className="letter">L</span></div></div>
                <div className="book blue decor-simple" onClick={() => handleBookClick({ title: "Plotzy: Outlines", author: "System", color: "#23324d", spineText: "O", decorType: 'simple' })}><div className="spine"><span className="letter">O</span></div></div>
                <div className="book navy decor-simple" onClick={() => handleBookClick({ title: "Plotzy: Tales", author: "System", color: "#182536", spineText: "T", decorType: 'simple' })}><div className="spine"><span className="letter">T</span></div></div>
                <div className="book black decor-simple" onClick={() => handleBookClick({ title: "Plotzy: Zenith", author: "System", color: "#141517", spineText: "Z", decorType: 'simple' })}><div className="spine"><span className="letter">Z</span></div></div>
                <div className="book black decor-simple" onClick={() => handleBookClick({ title: "Plotzy: Yesteryear", author: "System", color: "#141517", spineText: "Y", decorType: 'simple' })}><div className="spine"><span className="letter">Y</span></div></div>

                <div className="book navy decor-simple line-bottom" onClick={() => handleBookClick({ title: "Tides", author: "S. Sailor", color: "#182536", spineText: "", decorType: 'simple' })}><div className="spine"></div></div>
                <div className="book navy decor-simple line-bottom" onClick={() => handleBookClick({ title: "Currents", author: "S. Sailor", color: "#182536", spineText: "", decorType: 'simple' })}><div className="spine"></div></div>
                <div className="book black decor-heavy long-line" onClick={() => handleBookClick({ title: "Shadows", author: "N. Dark", color: "#141517", spineText: "", decorType: 'heavy' })}><div className="spine"></div></div>
                <div className="book black has-lines long-line" onClick={() => handleBookClick({ title: "Nightfall", author: "N. Dark", color: "#141517", spineText: "", decorType: 'lines' })}><div className="spine"></div></div>
                <div className="book green decor-heavy" onClick={() => handleBookClick({ title: "Forests", author: "E. Wood", color: "#23452b", spineText: "", decorType: 'heavy' })}><div className="spine"></div></div>
            </div>
        </div>
    );
}
