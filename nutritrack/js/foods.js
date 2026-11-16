/* NutriTrack – built-in Indian food database.
 *
 * IMPORTANT: every value here is an ESTIMATE. Figures are approximate, typical
 * home-style values per 100 g (or 100 ml) and have NOT been verified against a
 * laboratory source or an official food-composition table. Real values vary with
 * recipe, oil, brand and portion size.
 *
 * Row format:
 * [id, name, category, diet, kcal, protein, carbs, fat, "serving label:grams|…", "aliases", unit?]
 * diet: vegan | veg | egg | nonveg        unit: "g" (default) or "ml"
 */
(function () {
  'use strict';

  var ROWS = [
    // ── Rotis & breads ───────────────────────────────────────────────
    ['roti', 'Roti / Chapati', 'Rotis & Breads', 'vegan', 262, 8.7, 50, 3.7, '1 medium:40|1 small:30|1 large:50', 'chapati chapatti phulka wheat roti fulka'],
    ['phulka', 'Phulka (no oil)', 'Rotis & Breads', 'vegan', 240, 8.5, 49, 1.5, '1 phulka:30', 'roti chapati fulka'],
    ['roti-ghee', 'Roti with ghee', 'Rotis & Breads', 'veg', 310, 8, 46, 10, '1 medium:45', 'chapati ghee butter roti'],
    ['paratha', 'Plain paratha', 'Rotis & Breads', 'veg', 320, 7, 45, 12.5, '1 paratha:80|1 small:60', 'parantha lachha'],
    ['aloo-paratha', 'Aloo paratha', 'Rotis & Breads', 'veg', 245, 5.5, 36, 9, '1 paratha:120', 'parantha potato stuffed'],
    ['paneer-paratha', 'Paneer paratha', 'Rotis & Breads', 'veg', 270, 9.5, 32, 11.5, '1 paratha:120', 'parantha stuffed'],
    ['methi-thepla', 'Methi thepla', 'Rotis & Breads', 'veg', 300, 8, 42, 11, '1 thepla:40', 'gujarati'],
    ['naan', 'Naan', 'Rotis & Breads', 'veg', 290, 9, 50, 6, '1 naan:90', 'tandoori'],
    ['butter-naan', 'Butter naan', 'Rotis & Breads', 'veg', 310, 8.5, 48, 9.5, '1 naan:95', ''],
    ['puri', 'Puri', 'Rotis & Breads', 'vegan', 350, 7, 45, 16, '1 puri:25|3 puris:75', 'poori'],
    ['bhatura', 'Bhatura', 'Rotis & Breads', 'veg', 360, 7.5, 46, 16, '1 bhatura:80', 'bhature chole'],
    ['bajra-roti', 'Bajra roti', 'Rotis & Breads', 'vegan', 255, 7, 48, 4, '1 roti:50', 'millet bhakri pearl'],
    ['jowar-roti', 'Jowar roti', 'Rotis & Breads', 'vegan', 245, 7, 50, 2.5, '1 roti:50', 'millet bhakri sorghum'],
    ['makki-roti', 'Makki ki roti', 'Rotis & Breads', 'veg', 250, 5.5, 48, 4, '1 roti:60', 'corn maize'],
    ['bread-white', 'White bread', 'Rotis & Breads', 'veg', 265, 8, 50, 3.2, '1 slice:28|2 slices:56', 'toast pav'],
    ['bread-brown', 'Brown bread', 'Rotis & Breads', 'veg', 247, 10, 43, 3.5, '1 slice:30|2 slices:60', 'toast whole wheat'],
    ['pav', 'Pav (bun)', 'Rotis & Breads', 'veg', 280, 8.5, 52, 4, '1 pav:35|2 pav:70', 'bun ladi'],

    // ── Rice & grains ────────────────────────────────────────────────
    ['rice', 'Steamed rice (white)', 'Rice & Grains', 'vegan', 130, 2.7, 28, 0.3, '1 katori:150|1 plate:250|1 cup:180', 'chawal plain boiled bhaat'],
    ['brown-rice', 'Brown rice (cooked)', 'Rice & Grains', 'vegan', 123, 2.7, 25.6, 1, '1 katori:150|1 plate:250', 'chawal'],
    ['jeera-rice', 'Jeera rice', 'Rice & Grains', 'veg', 160, 3, 28, 4, '1 katori:150|1 plate:250', 'cumin chawal'],
    ['veg-pulao', 'Veg pulao', 'Rice & Grains', 'veg', 150, 3.2, 25, 4, '1 katori:150|1 plate:250', 'pulav pilaf'],
    ['veg-biryani', 'Veg biryani', 'Rice & Grains', 'veg', 160, 3.8, 26, 4.5, '1 katori:150|1 plate:300', 'biriyani'],
    ['chicken-biryani', 'Chicken biryani', 'Rice & Grains', 'nonveg', 180, 9, 22, 6, '1 katori:150|1 plate:300', 'biriyani'],
    ['curd-rice', 'Curd rice', 'Rice & Grains', 'veg', 115, 3.2, 17, 3.6, '1 katori:150|1 plate:250', 'thayir sadam dahi chawal'],
    ['lemon-rice', 'Lemon rice', 'Rice & Grains', 'vegan', 165, 3, 28, 4.5, '1 katori:150|1 plate:250', 'chitranna'],
    ['khichdi', 'Dal khichdi', 'Rice & Grains', 'veg', 120, 4.5, 20, 2.5, '1 katori:150|1 plate:300', 'khichri moong'],
    ['dalia', 'Dalia (veg, cooked)', 'Rice & Grains', 'veg', 95, 3, 17, 1.5, '1 katori:150|1 bowl:250', 'broken wheat daliya porridge'],
    ['oats', 'Oats porridge (with milk)', 'Rice & Grains', 'veg', 110, 4.5, 15, 3.5, '1 bowl:250|1 katori:150', 'oatmeal'],

    // ── Dal & legumes ────────────────────────────────────────────────
    ['dal-tadka', 'Dal tadka (toor)', 'Dal & Legumes', 'veg', 115, 6, 15, 3.5, '1 katori:150|1 bowl:250', 'arhar yellow dal fry lentil'],
    ['moong-dal', 'Moong dal (cooked)', 'Dal & Legumes', 'veg', 105, 7, 15, 2, '1 katori:150|1 bowl:250', 'yellow lentil'],
    ['masoor-dal', 'Masoor dal (cooked)', 'Dal & Legumes', 'veg', 110, 7, 16, 2, '1 katori:150|1 bowl:250', 'red lentil'],
    ['chana-dal', 'Chana dal (cooked)', 'Dal & Legumes', 'veg', 125, 7, 18, 3, '1 katori:150', 'bengal gram lentil'],
    ['dal-makhani', 'Dal makhani', 'Dal & Legumes', 'veg', 150, 6, 14, 8, '1 katori:150|1 bowl:250', 'urad black dal'],
    ['sambar', 'Sambar', 'Dal & Legumes', 'vegan', 65, 3, 10, 1.5, '1 katori:150|1 bowl:250', 'sambhar'],
    ['rasam', 'Rasam', 'Dal & Legumes', 'vegan', 30, 1, 5, 0.8, '1 katori:150', 'saaru'],
    ['rajma', 'Rajma masala', 'Dal & Legumes', 'veg', 125, 6.5, 17, 3.5, '1 katori:150|1 bowl:250', 'kidney beans curry'],
    ['chole', 'Chana masala (chole)', 'Dal & Legumes', 'veg', 140, 7, 19, 4.5, '1 katori:150|1 bowl:250', 'chickpea chhole kabuli'],
    ['kala-chana', 'Kala chana curry', 'Dal & Legumes', 'veg', 135, 7.5, 19, 3.5, '1 katori:150', 'black chickpea'],
    ['boiled-chana', 'Boiled chana (chickpeas)', 'Dal & Legumes', 'vegan', 164, 8.9, 27, 2.6, '1 katori:120|1 handful:40', 'chickpea kabuli'],
    ['sprouts', 'Moong sprouts (steamed)', 'Dal & Legumes', 'vegan', 60, 5, 10, 0.4, '1 katori:100', 'sprouted salad'],
    ['lobia', 'Lobia curry', 'Dal & Legumes', 'veg', 120, 6, 16, 3.5, '1 katori:150', 'black eyed peas chawli'],
    ['kadhi', 'Kadhi', 'Dal & Legumes', 'veg', 85, 3, 8, 4.5, '1 katori:150', 'pakora besan curd'],
    ['soya-curry', 'Soya chunks curry', 'Dal & Legumes', 'veg', 140, 13, 9, 6, '1 katori:150', 'nutrela soyabean'],

    // ── Paneer & dairy ───────────────────────────────────────────────
    ['paneer', 'Paneer (raw)', 'Paneer & Dairy', 'veg', 290, 18.5, 3, 23, '50 g piece:50|1 cube:25', 'cottage cheese'],
    ['paneer-butter-masala', 'Paneer butter masala', 'Paneer & Dairy', 'veg', 190, 8, 8, 14, '1 katori:150', 'makhani shahi'],
    ['palak-paneer', 'Palak paneer', 'Paneer & Dairy', 'veg', 150, 8, 6, 10.5, '1 katori:150', 'spinach saag'],
    ['matar-paneer', 'Matar paneer', 'Paneer & Dairy', 'veg', 155, 7.5, 9, 10, '1 katori:150', 'mutter peas'],
    ['kadai-paneer', 'Kadai paneer', 'Paneer & Dairy', 'veg', 180, 9, 7, 13, '1 katori:150', 'karahi'],
    ['paneer-bhurji', 'Paneer bhurji', 'Paneer & Dairy', 'veg', 210, 12, 6, 15.5, '1 katori:120', 'scramble'],
    ['paneer-tikka', 'Paneer tikka', 'Paneer & Dairy', 'veg', 230, 14, 6, 16.5, '6 pieces:150|1 piece:25', 'tandoori'],
    ['milk-whole', 'Milk (whole)', 'Paneer & Dairy', 'veg', 66, 3.3, 4.8, 3.7, '1 glass:250|1 cup:200', 'doodh full cream cow', 'ml'],
    ['milk-toned', 'Milk (toned)', 'Paneer & Dairy', 'veg', 58, 3.1, 4.7, 3, '1 glass:250|1 cup:200', 'doodh', 'ml'],
    ['milk-double-toned', 'Milk (double toned)', 'Paneer & Dairy', 'veg', 46, 3.2, 4.8, 1.5, '1 glass:250|1 cup:200', 'doodh low fat', 'ml'],
    ['milk-buffalo', 'Buffalo milk', 'Paneer & Dairy', 'veg', 100, 3.8, 5, 6.9, '1 glass:250|1 cup:200', 'doodh bhains', 'ml'],
    ['curd', 'Curd (dahi)', 'Paneer & Dairy', 'veg', 62, 3.3, 4.6, 3.3, '1 katori:125|1 bowl:200', 'yogurt yoghurt dahi'],
    ['raita', 'Raita', 'Paneer & Dairy', 'veg', 60, 2.8, 5, 3, '1 katori:125', 'boondi cucumber curd'],
    ['chaas', 'Buttermilk (chaas)', 'Paneer & Dairy', 'veg', 20, 1, 2, 0.6, '1 glass:250', 'chhaas mattha majjige', 'ml'],
    ['lassi', 'Sweet lassi', 'Paneer & Dairy', 'veg', 85, 2.6, 13, 2.5, '1 glass:250', 'punjabi', 'ml'],
    ['ghee', 'Ghee', 'Paneer & Dairy', 'veg', 900, 0, 0, 100, '1 tsp:5|1 tbsp:13', 'clarified butter'],
    ['butter', 'Butter', 'Paneer & Dairy', 'veg', 720, 0.6, 0.5, 81, '1 tsp:5|1 tbsp:14', 'makhan'],

    // ── Eggs ─────────────────────────────────────────────────────────
    ['egg-boiled', 'Boiled egg', 'Eggs', 'egg', 155, 12.6, 1.1, 10.6, '1 egg:50|2 eggs:100', 'anda'],
    ['egg-white', 'Egg white (boiled)', 'Eggs', 'egg', 52, 11, 0.7, 0.2, '1 white:33|3 whites:99', 'anda'],
    ['omelette', 'Masala omelette', 'Eggs', 'egg', 185, 11.5, 1.5, 15, '1-egg omelette:60|2-egg omelette:120', 'anda omelet'],
    ['egg-bhurji', 'Egg bhurji', 'Eggs', 'egg', 180, 11, 3, 14, '1 katori:120', 'anda scrambled'],
    ['egg-curry', 'Egg curry', 'Eggs', 'egg', 130, 8, 4.5, 9, '2 eggs with gravy:200|1 egg with gravy:100', 'anda masala'],
    ['egg-fried', 'Fried egg', 'Eggs', 'egg', 196, 13.6, 0.8, 15, '1 egg:46', 'anda half fry sunny'],

    // ── Chicken, meat & fish ─────────────────────────────────────────
    ['chicken-breast', 'Chicken breast (grilled)', 'Chicken, Meat & Fish', 'nonveg', 165, 31, 0, 3.6, '1 piece:120', 'murgh boneless'],
    ['chicken-curry', 'Chicken curry', 'Chicken, Meat & Fish', 'nonveg', 140, 13, 4, 8, '1 katori:150|1 bowl:250', 'murgh masala gravy'],
    ['butter-chicken', 'Butter chicken', 'Chicken, Meat & Fish', 'nonveg', 165, 12, 5.5, 10.5, '1 katori:150|1 bowl:250', 'murgh makhani'],
    ['tandoori-chicken', 'Tandoori chicken', 'Chicken, Meat & Fish', 'nonveg', 150, 22, 3, 5.5, '1 leg piece:100|2 pieces:200', 'murgh'],
    ['chicken-tikka', 'Chicken tikka', 'Chicken, Meat & Fish', 'nonveg', 150, 23, 3, 5, '6 pieces:150', 'murgh kebab'],
    ['fish-curry', 'Fish curry', 'Chicken, Meat & Fish', 'nonveg', 120, 14, 3.5, 5.5, '1 katori:150', 'machli meen'],
    ['fish-fry', 'Fish fry', 'Chicken, Meat & Fish', 'nonveg', 200, 19, 7, 10.5, '1 piece:80', 'machli'],
    ['prawn-curry', 'Prawn curry', 'Chicken, Meat & Fish', 'nonveg', 110, 13, 4, 4.5, '1 katori:150', 'jhinga shrimp'],
    ['mutton-curry', 'Mutton curry', 'Chicken, Meat & Fish', 'nonveg', 180, 14, 4, 12, '1 katori:150', 'gosht rogan josh'],
    ['keema', 'Keema', 'Chicken, Meat & Fish', 'nonveg', 195, 15, 4, 13, '1 katori:120', 'mince qeema'],

    // ── Breakfast & South Indian ─────────────────────────────────────
    ['poha', 'Poha', 'Breakfast & South Indian', 'vegan', 150, 2.8, 25, 4.3, '1 plate:180|1 katori:120', 'kanda batata flattened rice pohe'],
    ['upma', 'Upma', 'Breakfast & South Indian', 'veg', 135, 3.2, 20, 4.8, '1 katori:150|1 plate:220', 'rava suji uppittu'],
    ['sevai', 'Vermicelli upma', 'Breakfast & South Indian', 'veg', 140, 3, 23, 4, '1 katori:150', 'semiya sevai'],
    ['idli', 'Idli', 'Breakfast & South Indian', 'vegan', 132, 4, 27, 0.5, '1 idli:40|2 idlis:80|3 idlis:120', 'idly'],
    ['dosa', 'Plain dosa', 'Breakfast & South Indian', 'vegan', 168, 3.9, 29, 3.7, '1 dosa:80', 'dosai sada'],
    ['masala-dosa', 'Masala dosa', 'Breakfast & South Indian', 'veg', 185, 3.8, 28, 6.5, '1 dosa:180', 'dosai aloo'],
    ['rava-dosa', 'Rava dosa', 'Breakfast & South Indian', 'veg', 195, 4, 30, 6.5, '1 dosa:100', 'suji'],
    ['uttapam', 'Uttapam', 'Breakfast & South Indian', 'vegan', 165, 4.2, 27, 4.2, '1 uttapam:120', 'uthappam onion'],
    ['medu-vada', 'Medu vada', 'Breakfast & South Indian', 'vegan', 290, 8, 32, 14.5, '1 vada:45|2 vadas:90', 'wada urad'],
    ['coconut-chutney', 'Coconut chutney', 'Breakfast & South Indian', 'vegan', 180, 3, 8, 15.5, '1 tbsp:20|1 small katori:50', 'nariyal'],
    ['besan-chilla', 'Besan chilla', 'Breakfast & South Indian', 'vegan', 190, 9, 22, 7, '1 chilla:70', 'cheela gram flour pudla'],
    ['moong-chilla', 'Moong dal chilla', 'Breakfast & South Indian', 'vegan', 170, 10, 21, 5, '1 chilla:70', 'cheela pesarattu'],
    ['sabudana-khichdi', 'Sabudana khichdi', 'Breakfast & South Indian', 'vegan', 195, 2.5, 32, 6.5, '1 katori:150', 'sago tapioca vrat'],

    // ── Vegetables & sabzi ───────────────────────────────────────────
    ['aloo-gobi', 'Aloo gobi', 'Vegetables & Sabzi', 'vegan', 95, 2.3, 11, 4.8, '1 katori:150', 'potato cauliflower sabji'],
    ['aloo-sabzi', 'Aloo sabzi (dry)', 'Vegetables & Sabzi', 'vegan', 110, 2, 16, 4.5, '1 katori:150', 'potato jeera sabji'],
    ['bhindi', 'Bhindi masala', 'Vegetables & Sabzi', 'vegan', 95, 2.2, 8.5, 6, '1 katori:120', 'okra ladyfinger sabji'],
    ['baingan-bharta', 'Baingan bharta', 'Vegetables & Sabzi', 'vegan', 85, 2, 8, 5.2, '1 katori:150', 'brinjal eggplant'],
    ['mixed-veg', 'Mixed veg sabzi', 'Vegetables & Sabzi', 'vegan', 90, 2.5, 10, 4.5, '1 katori:150', 'sabji vegetable'],
    ['sarson-saag', 'Sarson ka saag', 'Vegetables & Sabzi', 'veg', 100, 3.5, 8, 6, '1 katori:150', 'mustard greens palak'],
    ['lauki', 'Lauki sabzi', 'Vegetables & Sabzi', 'vegan', 55, 1.2, 6, 3, '1 katori:150', 'bottle gourd doodhi ghiya'],
    ['cabbage', 'Cabbage sabzi', 'Vegetables & Sabzi', 'vegan', 70, 1.8, 7.5, 3.8, '1 katori:150', 'patta gobhi'],
    ['salad', 'Kachumber salad', 'Vegetables & Sabzi', 'vegan', 22, 1, 4.5, 0.2, '1 katori:100|1 plate:200', 'cucumber tomato onion'],
    ['cucumber', 'Cucumber', 'Vegetables & Sabzi', 'vegan', 15, 0.7, 3.6, 0.1, '1 medium:200|1 katori slices:100', 'kheera kakdi'],
    ['tomato', 'Tomato', 'Vegetables & Sabzi', 'vegan', 18, 0.9, 3.9, 0.2, '1 medium:90', 'tamatar'],
    ['carrot', 'Carrot', 'Vegetables & Sabzi', 'vegan', 41, 0.9, 9.6, 0.2, '1 medium:60', 'gajar'],
    ['onion', 'Onion (raw)', 'Vegetables & Sabzi', 'vegan', 40, 1.1, 9.3, 0.1, '1 medium:100', 'pyaz kanda'],
    ['potato-boiled', 'Boiled potato', 'Vegetables & Sabzi', 'vegan', 87, 1.9, 20, 0.1, '1 medium:120', 'aloo'],
    ['sweet-potato', 'Boiled sweet potato', 'Vegetables & Sabzi', 'vegan', 86, 1.6, 20, 0.1, '1 medium:130', 'shakarkandi'],
    ['sweet-corn', 'Boiled sweet corn', 'Vegetables & Sabzi', 'vegan', 96, 3.4, 21, 1.5, '1 cup:150', 'bhutta makka'],

    // ── Fruits ───────────────────────────────────────────────────────
    ['banana', 'Banana', 'Fruits', 'vegan', 89, 1.1, 22.8, 0.3, '1 medium:100|1 small:80|1 large:120', 'kela'],
    ['apple', 'Apple', 'Fruits', 'vegan', 52, 0.3, 13.8, 0.2, '1 medium:180|1 small:140', 'seb'],
    ['mango', 'Mango', 'Fruits', 'vegan', 60, 0.8, 15, 0.4, '1 medium:200|1 cup slices:165', 'aam'],
    ['orange', 'Orange', 'Fruits', 'vegan', 47, 0.9, 11.8, 0.1, '1 medium:130', 'santra narangi'],
    ['papaya', 'Papaya', 'Fruits', 'vegan', 43, 0.5, 10.8, 0.3, '1 cup:145|1 katori:120', 'papita'],
    ['guava', 'Guava', 'Fruits', 'vegan', 68, 2.6, 14.3, 1, '1 medium:100', 'amrood peru'],
    ['watermelon', 'Watermelon', 'Fruits', 'vegan', 30, 0.6, 7.6, 0.2, '1 cup:150|1 big slice:280', 'tarbooz'],
    ['pomegranate', 'Pomegranate', 'Fruits', 'vegan', 83, 1.7, 18.7, 1.2, '1 katori:100', 'anar'],
    ['grapes', 'Grapes', 'Fruits', 'vegan', 69, 0.7, 18, 0.2, '1 cup:150', 'angoor'],
    ['chikoo', 'Chikoo (sapota)', 'Fruits', 'vegan', 83, 0.4, 20, 1.1, '1 medium:80', 'sapodilla'],
    ['pineapple', 'Pineapple', 'Fruits', 'vegan', 50, 0.5, 13, 0.1, '1 cup:165', 'ananas'],
    ['dates', 'Dates', 'Fruits', 'vegan', 282, 2.5, 75, 0.4, '1 date:8|3 dates:24', 'khajoor'],

    // ── Snacks ───────────────────────────────────────────────────────
    ['samosa', 'Samosa', 'Snacks', 'vegan', 310, 5, 34, 17, '1 medium:80|1 small:50', 'aloo'],
    ['kachori', 'Kachori', 'Snacks', 'vegan', 380, 7, 40, 21, '1 kachori:50', 'khasta'],
    ['pakora', 'Pakora / bhajiya', 'Snacks', 'vegan', 300, 7, 28, 18, '4 pieces:80|1 plate:150', 'pakoda bhaji fritter onion'],
    ['vada-pav', 'Vada pav', 'Snacks', 'vegan', 197, 5, 30, 6.5, '1 vada pav:150', 'wada'],
    ['pav-bhaji', 'Pav bhaji', 'Snacks', 'veg', 150, 3.8, 21, 5.5, '1 plate (2 pav):350', ''],
    ['dhokla', 'Dhokla', 'Snacks', 'veg', 160, 6, 22, 5.5, '1 piece:40|4 pieces:160', 'khaman'],
    ['bhel-puri', 'Bhel puri', 'Snacks', 'vegan', 190, 5, 31, 5.5, '1 plate:150', 'chaat bhelpuri'],
    ['pani-puri', 'Pani puri', 'Snacks', 'vegan', 130, 2.5, 22, 3.6, '6 pieces:150', 'golgappa puchka chaat'],
    ['sev-puri', 'Sev puri', 'Snacks', 'vegan', 200, 4.5, 26, 9, '6 pieces:180', 'chaat'],
    ['aloo-tikki', 'Aloo tikki', 'Snacks', 'vegan', 190, 3.5, 26, 8, '1 tikki:75|2 tikkis:150', 'chaat patty'],
    ['veg-sandwich', 'Veg grilled sandwich', 'Snacks', 'veg', 190, 6, 27, 6.5, '1 sandwich:150', 'toast'],
    ['veg-momos', 'Veg momos (steamed)', 'Snacks', 'vegan', 135, 4.5, 22, 3.2, '6 pieces:150', 'dumpling'],
    ['chicken-momos', 'Chicken momos (steamed)', 'Snacks', 'nonveg', 150, 9, 19, 4, '6 pieces:150', 'dumpling'],
    ['instant-noodles', 'Instant noodles (masala)', 'Snacks', 'veg', 445, 9, 62, 17, '1 pack, dry weight:70', 'maggi'],
    ['namkeen', 'Namkeen mixture', 'Snacks', 'vegan', 520, 12, 45, 33, '1 handful:30', 'chivda sev bhujia farsan'],
    ['khakhra', 'Khakhra', 'Snacks', 'vegan', 400, 12, 66, 9, '1 khakhra:20', 'gujarati'],
    ['roasted-chana', 'Roasted chana', 'Snacks', 'vegan', 369, 22.5, 58, 5.2, '1 handful:30', 'bhuna chana'],
    ['makhana', 'Makhana (roasted)', 'Snacks', 'vegan', 347, 9.7, 77, 0.1, '1 bowl:25', 'fox nut lotus seed'],
    ['peanuts', 'Peanuts (roasted)', 'Snacks', 'vegan', 567, 25.8, 16, 49, '1 handful:30', 'moongphali groundnut'],
    ['almonds', 'Almonds', 'Snacks', 'vegan', 579, 21, 21.6, 50, '10 almonds:12', 'badam'],
    ['cashews', 'Cashews', 'Snacks', 'vegan', 553, 18, 30, 44, '10 cashews:15', 'kaju'],
    ['marie', 'Marie biscuit', 'Snacks', 'veg', 440, 8, 76, 11, '4 biscuits:22|1 biscuit:5.5', 'tea biscuit'],
    ['glucose-biscuit', 'Glucose biscuit', 'Snacks', 'veg', 455, 7, 76, 13, '4 biscuits:22', 'tea biscuit'],
    ['chips', 'Potato chips', 'Snacks', 'vegan', 540, 6.5, 52, 34, '1 small pack:30', 'wafers crisps'],

    // ── Sweets ───────────────────────────────────────────────────────
    ['gulab-jamun', 'Gulab jamun', 'Sweets', 'veg', 300, 4.5, 45, 11.5, '1 piece:50', 'mithai'],
    ['rasgulla', 'Rasgulla', 'Sweets', 'veg', 186, 4, 38, 2, '1 piece:50', 'rosogolla mithai'],
    ['jalebi', 'Jalebi', 'Sweets', 'veg', 370, 4, 64, 11, '1 piece:30', 'mithai'],
    ['kheer', 'Rice kheer', 'Sweets', 'veg', 135, 3.8, 20, 4.5, '1 katori:150', 'payasam pudding'],
    ['gajar-halwa', 'Gajar halwa', 'Sweets', 'veg', 220, 4, 28, 10.5, '1 katori:100', 'carrot'],
    ['sooji-halwa', 'Sooji halwa', 'Sweets', 'veg', 280, 3.5, 40, 12, '1 katori:100', 'sheera rava kesari'],
    ['besan-ladoo', 'Besan ladoo', 'Sweets', 'veg', 480, 9, 52, 26, '1 ladoo:40', 'laddu mithai'],
    ['kaju-katli', 'Kaju katli', 'Sweets', 'veg', 450, 10, 55, 21, '1 piece:20', 'barfi mithai'],
    ['jaggery', 'Jaggery', 'Sweets', 'vegan', 383, 0.4, 98, 0.1, '1 small piece:10', 'gur gud'],
    ['sugar', 'Sugar', 'Sweets', 'vegan', 387, 0, 100, 0, '1 tsp:4', 'cheeni shakkar'],
    ['honey', 'Honey', 'Sweets', 'veg', 304, 0.3, 82, 0, '1 tsp:7', 'shahad'],

    // ── Beverages ────────────────────────────────────────────────────
    ['chai', 'Masala chai (milk & sugar)', 'Beverages', 'veg', 55, 1.6, 8, 1.8, '1 cup:150|1 cutting:80', 'tea chaha', 'ml'],
    ['chai-no-sugar', 'Chai (milk, no sugar)', 'Beverages', 'veg', 32, 1.6, 2.5, 1.8, '1 cup:150', 'tea', 'ml'],
    ['coffee', 'Coffee (milk & sugar)', 'Beverages', 'veg', 60, 1.8, 8.5, 2, '1 cup:150', 'filter kaapi', 'ml'],
    ['black-coffee', 'Black coffee', 'Beverages', 'vegan', 2, 0.1, 0, 0, '1 cup:150', '', 'ml'],
    ['nimbu-pani', 'Nimbu pani (sweet)', 'Beverages', 'vegan', 28, 0.1, 7, 0, '1 glass:250', 'lemonade shikanji lemon', 'ml'],
    ['coconut-water', 'Coconut water', 'Beverages', 'vegan', 19, 0.7, 3.7, 0.2, '1 glass:250|1 coconut:300', 'nariyal pani', 'ml'],
    ['sugarcane-juice', 'Sugarcane juice', 'Beverages', 'vegan', 60, 0.1, 15, 0, '1 glass:250', 'ganne ka ras', 'ml'],
    ['orange-juice', 'Fresh orange juice', 'Beverages', 'vegan', 45, 0.7, 10.4, 0.2, '1 glass:250', 'santra mosambi', 'ml'],
    ['banana-shake', 'Banana milkshake', 'Beverages', 'veg', 95, 3, 15, 2.8, '1 glass:250', 'kela shake', 'ml']
  ];

  var FOODS = ROWS.map(function (r) {
    var unit = r[10] || 'g';
    var servings = r[8].split('|').map(function (s) {
      var i = s.lastIndexOf(':');
      var g = parseFloat(s.slice(i + 1));
      return { label: s.slice(0, i) + ' (' + g + ' ' + unit + ')', factor: g / 100 };
    });
    servings.push({ label: '100 ' + unit, factor: 1 });
    return {
      id: r[0], name: r[1], category: r[2], diet: r[3],
      base: { kcal: r[4], protein: r[5], carbs: r[6], fat: r[7] },
      servings: servings, aliases: r[9] || '', unit: unit,
      gramBasis: 100, source: 'db'
    };
  });

  window.NT_FOODS = FOODS;
  window.NT_CATEGORIES = FOODS.reduce(function (a, f) {
    if (a.indexOf(f.category) < 0) a.push(f.category);
    return a;
  }, []);
})();
