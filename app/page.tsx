import Image from "next/image";

async function getRandomImgSrc() {
    const url = "https://testbooru.donmai.us/posts.json?random=true&limit=1";
    let data;

    try {
      const response = await fetch(url);
      data = await response.json();
      console.log(data);
    } catch (error) {
      console.error("Error fetching data: ", error);
    }

    return data[0].id;
  }

export default async function Home() {

  const img_src = await getRandomImgSrc();

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image src={ img_src } alt = "A randomly retrieved Danbooru image."/>
      </main>
    </div>
  );
}
