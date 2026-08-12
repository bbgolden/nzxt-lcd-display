import Image from "next/image";

async function getRandomImgSrc() {
    const url = "https://danbooru.donmai.us/posts.json?random=true&limit=1&tags=nero_claudius_(fate)";
    let data;

    try {
      const response = await fetch(url);
      data = await response.json();
      console.log(data);
    } catch (error) {
      console.error("Error fetching data: ", error);
    }

    return data[0].file_url;
  }

export default async function Home() {

  const img_src = await getRandomImgSrc();

  return (
    <div>
      <main>
        <Image src={ img_src } alt = "A randomly retrieved Danbooru image." height={ 320 } width={ 320 }/>
      </main>
    </div>
  );
}
